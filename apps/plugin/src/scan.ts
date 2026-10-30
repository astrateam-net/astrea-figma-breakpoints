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

  const counts = new Map<string, number>();
  for (const {node} of found) {
    for (const collectionId of Object.keys(node.explicitVariableModes)) {
      counts.set(collectionId, (counts.get(collectionId) ?? 0) + 1);
    }
  }

  const collections: CollectionInfo[] = [];
  const byKey = new Map<string, VariableCollection>();
  for (const [id, frameCount] of counts) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(id);
    if (!collection) continue;
    byKey.set(collection.key, collection);
    collections.push({
      key: collection.key,
      name: collection.name,
      remote: collection.remote,
      modes: collection.modes.map(mode => mode.name),
      frameCount,
    });
  }
  collections.sort((a, b) => b.frameCount - a.frameCount);

  // Best guess: the collection set on most frames that has several modes.
  const resolvedKey =
    themeKey && byKey.has(themeKey)
      ? themeKey
      : (collections.find(c => c.modes.length > 1)?.key ?? null);
  const theme = resolvedKey ? byKey.get(resolvedKey) : undefined;

  const frames: ScannedFrame[] = found.map(({node, sections}) => {
    const modeId = theme ? node.resolvedVariableModes[theme.id] : undefined;
    const mode = theme?.modes.find(m => m.modeId === modeId);
    return {
      id: node.id,
      name: node.name,
      width: node.width,
      sections,
      theme: mode?.name ?? null,
    };
  });

  return {pageId: page.id, frames, collections, themeKey: resolvedKey};
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
