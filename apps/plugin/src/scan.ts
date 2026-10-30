import type {ScannedFrame} from '@astrea/breakpoints-core';
import {NAMESPACE} from './storage';

/** Key on nodes the plugin generated; they are never scanned as originals. */
export const ROLE_KEY = 'role';

export interface PageInfo {
  id: string;
  name: string;
}

/** A variable collection that is set explicitly on at least one frame. */
export interface CollectionInfo {
  key: string;
  name: string;
  remote: boolean;
  modes: string[];
  /** Frames with an explicit mode of this collection. */
  frameCount: number;
}

export interface ScanResult {
  pageId: string;
  frames: ScannedFrame[];
  collections: CollectionInfo[];
  /** The chosen theme collection if found, else the best guess, else null. */
  themeKey: string | null;
}

/** Pages that can hold screens; divider pages like `---` are skipped. */
export function listPages(): PageInfo[] {
  return figma.root.children
    .filter(page => !/^[-–—\s]*$/.test(page.name))
    .map(page => ({id: page.id, name: page.name}));
}

interface FoundFrame {
  node: FrameNode;
  sections: string[];
}

function collectFrames(
  parent: PageNode | SectionNode,
  sections: string[],
  found: FoundFrame[],
): void {
  for (const child of parent.children) {
    if (child.getSharedPluginData(NAMESPACE, ROLE_KEY)) continue;
    if (child.type === 'SECTION') {
      collectFrames(child, [...sections, child.name], found);
    } else if (child.type === 'FRAME') {
      found.push({node: child, sections});
    }
  }
}

/**
 * Finds the top-level frames of a page (directly on the page or inside
 * sections, at any depth) and the variable collections set on them.
 */
export async function scanPage(
  page: PageNode,
  themeKey: string | null,
): Promise<ScanResult> {
  await page.loadAsync();
  const found: FoundFrame[] = [];
  collectFrames(page, [], found);

  // Modes set on the frame or inherited from its sections. Not
  // `resolvedVariableModes`: it lists only collections whose variables are
  // used inside the node, so an empty frame would lose its theme.
  const explicit = found.map(({node}) => explicitModes(node));

  // One library collection can appear under several IDs (one per imported
  // version), so collections are grouped by key and modes looked up in
  // every version.
  const versions = new Map<string, VariableCollection[]>();
  const byId = new Map<string, VariableCollection>();
  for (const id of new Set(explicit.flatMap(m => [...m.keys()]))) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(id);
    if (!collection) continue;
    byId.set(id, collection);
    versions.set(collection.key, [
      ...(versions.get(collection.key) ?? []),
      collection,
    ]);
  }

  function modeName(collection: VariableCollection, modeId: string) {
    for (const version of [
      collection,
      ...(versions.get(collection.key) ?? []),
    ]) {
      const mode = version.modes.find(m => m.modeId === modeId);
      if (mode) return mode.name;
    }
    return null;
  }

  const frameCounts = new Map<string, number>();
  const frames: ScannedFrame[] = found.map(({node, sections}, i) => {
    const modes: Record<string, string> = {};
    for (const [id, modeId] of explicit[i] ?? []) {
      const collection = byId.get(id);
      const name = collection ? modeName(collection, modeId) : null;
      if (!collection || !name) continue;
      modes[collection.key] = name;
      frameCounts.set(
        collection.key,
        (frameCounts.get(collection.key) ?? 0) + 1,
      );
    }
    return {id: node.id, name: node.name, width: node.width, sections, modes};
  });

  const collections: CollectionInfo[] = [...versions].map(([key, list]) => {
    const latest = list.reduce((a, b) =>
      b.modes.length > a.modes.length ? b : a,
    );
    return {
      key,
      name: latest.name,
      remote: latest.remote,
      modes: latest.modes.map(mode => mode.name),
      frameCount: frameCounts.get(key) ?? 0,
    };
  });

  // Best guess for the theme: the collection whose modes differ the most
  // between frames (Light / Dark), then the one set on most frames.
  const usedModes = (key: string) =>
    new Set(frames.map(f => f.modes[key]).filter(Boolean)).size;
  collections.sort(
    (a, b) =>
      usedModes(b.key) - usedModes(a.key) || b.frameCount - a.frameCount,
  );
  const guess = collections.find(c => usedModes(c.key) > 1)?.key ?? null;

  return {
    pageId: page.id,
    frames,
    collections,
    themeKey: themeKey && versions.has(themeKey) ? themeKey : guess,
  };
}

/** Collection id → mode id set on the node, else on its nearest ancestor. */
function explicitModes(node: SceneNode): Map<string, string> {
  const modes = new Map<string, string>();
  let current: BaseNode | null = node;
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    if ('explicitVariableModes' in current) {
      for (const [id, modeId] of Object.entries(
        current.explicitVariableModes,
      )) {
        if (!modes.has(id)) modes.set(id, modeId);
      }
    }
    current = current.parent;
  }
  return modes;
}

function pageOf(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;
  while (current) {
    if (current.type === 'PAGE') return current;
    current = current.parent;
  }
  return null;
}

/** Selects nodes (switching page if needed) and zooms to them. */
export async function revealNodes(ids: string[]): Promise<void> {
  const nodes: SceneNode[] = [];
  for (const id of ids) {
    const node = await figma.getNodeByIdAsync(id);
    if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
      nodes.push(node);
    }
  }
  if (nodes.length === 0) {
    figma.notify('That frame no longer exists', {error: true});
    return;
  }
  const page = nodes[0] ? pageOf(nodes[0]) : null;
  if (page && page.id !== figma.currentPage.id) {
    await figma.setCurrentPageAsync(page);
  }
  figma.currentPage.selection = nodes;
  figma.viewport.scrollAndZoomIntoView(nodes);
}
