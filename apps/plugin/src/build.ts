import {
  compareFrames,
  type DeviceGroup,
  type Finding,
  type FrameBox,
  GROUP_ORDER,
  hashString,
  type PlanGroup,
  type PlanItem,
  type PlanRoute,
} from '@astrea/breakpoints-core';
import {CHECK_PAGE_NAME} from './constants';
import {ROLE_KEY} from './scan';
import {NAMESPACE} from './storage';

const ROLE_PAGE = 'check-page';
const ROLE_ROUTE = 'route';
const ROUTE_KEY = 'route';
const FINGERPRINT_KEY = 'fingerprint';
const SOURCE_KEY = 'source';
const FINDINGS_KEY = 'findings';
/** Findings kept per route; plugin data entries are limited to 100 kB. */
const MAX_FINDINGS = 300;

const PADDING = 160;
const THEME_COLUMN = 480;
const COPY_GAP = 120;
const GROUP_GAP = 400;
const LABEL_AREA = 140;
const ROW_GAP = 400;
const ROUTE_GAP = 600;

const FONT: FontName = {family: 'Inter', style: 'Regular'};
const FONT_BOLD: FontName = {family: 'Inter', style: 'Semi Bold'};
/** Section fill when the source frame is not in a section (Figma's #444). */
const SECTION_FILL: RGB = {r: 68 / 255, g: 68 / 255, b: 68 / 255};
const DARK_TEXT = {
  text: {r: 0.2, g: 0.2, b: 0.22},
  muted: {r: 0.45, g: 0.45, b: 0.48},
};
const LIGHT_TEXT = {
  text: {r: 0.95, g: 0.95, b: 0.96},
  muted: {r: 0.7, g: 0.7, b: 0.73},
};
const FOLD: RGB = {r: 0.85, g: 0.16, b: 0.11};
const GAP_FILL: RGB = {r: 0.93, g: 0.93, b: 0.94};

const GROUP_TITLE: Record<DeviceGroup, string> = {
  phone: 'Phones',
  tablet: 'Tablets',
  computer: 'Computers',
};

export interface Progress {
  done: number;
  total: number;
  label: string;
}

export interface BuildOptions {
  /** Routes to (re)build; null = all. Routes not in the plan are removed. */
  only: ReadonlySet<string> | null;
  fingerprints: Record<string, string>;
  isCancelled: () => boolean;
  onProgress: (progress: Progress) => void;
}

export type BuildResult =
  | {
      status: 'built';
      pageId: string;
      routes: number;
      copies: number;
      gaps: number;
    }
  | {status: 'cancelled'};

function setRole(node: BaseNode, role: string): void {
  node.setSharedPluginData(NAMESPACE, ROLE_KEY, role);
}

function roleOf(node: BaseNode): string {
  return node.getSharedPluginData(NAMESPACE, ROLE_KEY);
}

function findCheckPage(): PageNode | undefined {
  const pages = figma.root.children;
  return (
    pages.find(p => roleOf(p) === ROLE_PAGE) ??
    pages.find(p => p.name === CHECK_PAGE_NAME)
  );
}

/**
 * What the check page was built from: route key → fingerprint. Empty when
 * nothing is built yet; `exists` tells whether the page itself is there.
 */
export async function readBuilt(): Promise<{
  exists: boolean;
  fingerprints: Record<string, string>;
  findings: Finding[];
}> {
  const page = findCheckPage();
  if (!page) return {exists: false, fingerprints: {}, findings: []};
  await page.loadAsync();
  const fingerprints: Record<string, string> = {};
  const findings: Finding[] = [];
  for (const node of page.children) {
    if (roleOf(node) !== ROLE_ROUTE) continue;
    fingerprints[node.getSharedPluginData(NAMESPACE, ROUTE_KEY)] =
      node.getSharedPluginData(NAMESPACE, FINGERPRINT_KEY);
    findings.push(
      ...parseFindings(node.getSharedPluginData(NAMESPACE, FINDINGS_KEY)),
    );
  }
  return {exists: Object.keys(fingerprints).length > 0, fingerprints, findings};
}

function parseFindings(json: string): Finding[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.filter(isFinding) : [];
  } catch {
    return [];
  }
}

function isFinding(value: unknown): value is Finding {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'route' in value &&
    'device' in value &&
    'nodeId' in value &&
    typeof value.nodeId === 'string'
  );
}

/** Horizontal layout of a frame's blocks, for comparing copy and original. */
function frameBox(frame: FrameNode): FrameBox {
  return {
    width: frame.width,
    blocks: frame.children.map(child => ({
      id: child.id,
      name: child.name,
      x: child.x,
      width: child.width,
      scrolls:
        'overflowDirection' in child &&
        (child.overflowDirection === 'HORIZONTAL' ||
          child.overflowDirection === 'BOTH'),
    })),
  };
}

/**
 * The structure of a frame: its size and its direct children (name, type,
 * size, position). Edits inside instances don't change it.
 */
export function frameSignature(frame: FrameNode): string {
  const parts = [
    frame.name,
    Math.round(frame.width),
    Math.round(frame.height),
    ...frame.children.map(
      c =>
        `${c.name}:${c.type}:${Math.round(c.width)}x${Math.round(c.height)}@${Math.round(c.x)},${Math.round(c.y)}`,
    ),
  ];
  return hashString(parts.join('|'));
}

async function checkPage(sourcePage: PageNode): Promise<PageNode> {
  const page = findCheckPage();
  if (page) {
    setRole(page, ROLE_PAGE);
    await page.loadAsync();
    return page;
  }
  const created = figma.createPage();
  created.name = CHECK_PAGE_NAME;
  const pages = figma.root.children;
  figma.root.insertChild(pages.indexOf(sourcePage) + 1, created);
  setRole(created, ROLE_PAGE);
  return created;
}

function text(
  characters: string,
  {bold = false, size = 24, color = DARK_TEXT.text, width = 0} = {},
): TextNode {
  const node = figma.createText();
  node.fontName = bold ? FONT_BOLD : FONT;
  node.fontSize = size;
  node.characters = characters;
  node.fills = [{type: 'SOLID', color}];
  if (width > 0) {
    node.textAutoResize = 'HEIGHT';
    node.resize(width, node.height);
  }
  return node;
}

function placeholder(item: PlanItem): FrameNode {
  const frame = figma.createFrame();
  frame.resize(item.device.width, item.device.height);
  frame.fills = [{type: 'SOLID', color: GAP_FILL}];
  frame.name = `No frame for ${item.breakpoint?.name ?? 'this width'}`;
  const label = text(frame.name, {
    color: DARK_TEXT.muted,
    width: item.device.width - 48,
  });
  frame.appendChild(label);
  label.x = 24;
  label.y = 24;
  return frame;
}

/** A copy of the source frame at the device's width, its height hugging. */
async function copy(item: PlanItem): Promise<FrameNode | null> {
  if (!item.sourceId) return null;
  const source = await figma.getNodeByIdAsync(item.sourceId);
  if (!source || source.type !== 'FRAME') return null;
  const frame = source.clone();
  frame.resize(item.device.width, frame.height);
  if (frame.layoutMode === 'VERTICAL') frame.primaryAxisSizingMode = 'AUTO';
  if (frame.layoutMode === 'HORIZONTAL') frame.counterAxisSizingMode = 'AUTO';
  frame.setSharedPluginData(NAMESPACE, SOURCE_KEY, source.id);
  return frame;
}

/** x of every device column, shared by all theme rows of a route. */
function columns(groups: PlanGroup[]): {
  groupX: Map<DeviceGroup, number>;
  itemX: Map<string, number>;
  right: number;
} {
  const groupX = new Map<DeviceGroup, number>();
  const itemX = new Map<string, number>();
  let x = PADDING + THEME_COLUMN;
  for (const group of GROUP_ORDER) {
    const items = groups.find(g => g.group === group)?.items ?? [];
    if (items.length === 0) continue;
    groupX.set(group, x);
    for (const item of items) {
      itemX.set(item.device.id, x);
      x += item.device.width + COPY_GAP;
    }
    x += GROUP_GAP - COPY_GAP;
  }
  return {groupX, itemX, right: x - GROUP_GAP + PADDING};
}

const yieldToUi = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * The fill of the section that holds the route's frames, so copies sit on
 * the same background as the originals (white frames on a white section
 * would merge).
 */
async function sourceFills(route: PlanRoute): Promise<Paint[]> {
  for (const theme of route.themes) {
    for (const group of theme.groups) {
      for (const item of group.items) {
        if (!item.sourceId) continue;
        const node = await figma.getNodeByIdAsync(item.sourceId);
        const parent = node?.parent;
        if (parent?.type === 'SECTION' && Array.isArray(parent.fills)) {
          return [...parent.fills];
        }
      }
    }
  }
  return [{type: 'SOLID', color: SECTION_FILL}];
}

/** Light labels on a dark background, dark labels on a light one. */
function labelColors(fills: readonly Paint[]) {
  const solid = fills.find((f): f is SolidPaint => f.type === 'SOLID');
  if (!solid) return DARK_TEXT;
  const {r, g, b} = solid.color;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5 ? LIGHT_TEXT : DARK_TEXT;
}

async function buildRoute(
  route: PlanRoute,
  page: PageNode,
  fingerprint: string,
  step: () => Promise<boolean>,
): Promise<SectionNode | null> {
  const section = figma.createSection();
  section.name = route.key;
  setRole(section, ROLE_ROUTE);
  section.setSharedPluginData(NAMESPACE, ROUTE_KEY, route.key);
  section.setSharedPluginData(NAMESPACE, FINGERPRINT_KEY, fingerprint);
  page.appendChild(section);
  const fills = await sourceFills(route);
  section.fills = fills;
  const colors = labelColors(fills);

  const findings: Finding[] = [];
  const layout = columns(route.themes[0]?.groups ?? []);
  for (const [group, x] of layout.groupX) {
    const title = text(GROUP_TITLE[group], {
      bold: true,
      size: 64,
      color: colors.text,
    });
    section.appendChild(title);
    title.x = x;
    title.y = PADDING;
  }

  let y = PADDING + 64 * 1.4 + 120;
  for (const theme of route.themes) {
    const rowTop = y;
    let rowBottom = rowTop;
    if (theme.mode) {
      const label = text(theme.mode, {
        bold: true,
        size: 96,
        color: colors.text,
      });
      section.appendChild(label);
      label.x = PADDING;
      label.y = rowTop + LABEL_AREA;
    }
    for (const group of theme.groups) {
      for (const item of group.items) {
        if (!(await step())) {
          section.remove();
          return null;
        }
        const x = layout.itemX.get(item.device.id) ?? 0;
        const copied = await copy(item);
        const node = copied ?? placeholder(item);
        const where = {
          route: route.key,
          theme: theme.mode,
          device: item.device.name,
        };
        const original = item.sourceId
          ? await figma.getNodeByIdAsync(item.sourceId)
          : null;
        if (copied && original?.type === 'FRAME') {
          findings.push(
            ...compareFrames(frameBox(original), frameBox(copied), where),
          );
        } else {
          findings.push({
            ...where,
            kind: 'gap',
            block: '',
            nodeId: node.id,
            sourceNodeId: null,
            px: 0,
          });
        }
        const source = item.sourceId ? node.name : 'no frame';
        node.name = `${item.device.name} · ${source}`;

        const name = text(item.device.name, {
          bold: true,
          size: 32,
          color: colors.text,
          width: item.device.width,
        });
        const meta = text(
          `${item.device.width} × ${item.device.height} · ${source}`,
          {color: colors.muted, width: item.device.width},
        );
        section.appendChild(name);
        section.appendChild(meta);
        section.appendChild(node);
        name.x = x;
        name.y = rowTop;
        meta.x = x;
        meta.y = rowTop + name.height + 8;
        node.x = x;
        node.y = rowTop + LABEL_AREA;

        // The fold: what the device shows before scrolling.
        if (node.height > item.device.height) {
          const fold = figma.createLine();
          fold.name = 'Fold';
          fold.resize(item.device.width, 0);
          fold.strokes = [{type: 'SOLID', color: FOLD}];
          fold.dashPattern = [12, 8];
          fold.strokeWeight = 2;
          section.appendChild(fold);
          fold.x = x;
          fold.y = node.y + item.device.height;
        }
        rowBottom = Math.max(rowBottom, node.y + node.height);
      }
    }
    y = rowBottom + ROW_GAP;
  }

  section.resizeWithoutConstraints(layout.right, y - ROW_GAP + PADDING);
  section.setSharedPluginData(
    NAMESPACE,
    FINDINGS_KEY,
    JSON.stringify(findings.slice(0, MAX_FINDINGS)),
  );
  return section;
}

/** Stacks the route sections in plan order below anything else on the page. */
function stack(page: PageNode, order: string[]): SectionNode[] {
  const sections = page.children.filter(
    (n): n is SectionNode => n.type === 'SECTION' && roleOf(n) === ROLE_ROUTE,
  );
  const position = (s: SectionNode) =>
    order.indexOf(s.getSharedPluginData(NAMESPACE, ROUTE_KEY));
  sections.sort((a, b) => position(a) - position(b));

  let top = 0;
  for (const node of page.children) {
    if (roleOf(node) === ROLE_ROUTE) continue;
    top = Math.max(top, node.y + node.height + ROUTE_GAP);
  }
  for (const section of sections) {
    section.x = 0;
    section.y = top;
    top += section.height + ROUTE_GAP;
  }
  return sections;
}

/**
 * Builds (or updates) the check page: one section per route, a row per
 * theme with devices left to right by width, grouped as phones, tablets and
 * computers. Old sections are replaced only after the new ones are built;
 * cancelling removes what this run built and leaves the page as it was.
 */
export async function buildCheckPage(
  plan: PlanRoute[],
  sourcePage: PageNode,
  options: BuildOptions,
): Promise<BuildResult> {
  await Promise.all([
    figma.loadFontAsync(FONT),
    figma.loadFontAsync(FONT_BOLD),
  ]);
  const page = await checkPage(sourcePage);
  const routes = plan.filter(r => !options.only || options.only.has(r.key));
  const total = routes.reduce(
    (sum, r) =>
      sum +
      r.themes.reduce(
        (a, t) => a + t.groups.reduce((b, g) => b + g.items.length, 0),
        0,
      ),
    0,
  );

  const built: SectionNode[] = [];
  let done = 0;
  let copies = 0;
  let gaps = 0;
  for (const route of routes) {
    const section = await buildRoute(
      route,
      page,
      options.fingerprints[route.key] ?? '',
      async () => {
        if (options.isCancelled()) return false;
        options.onProgress({done, total, label: route.key});
        done++;
        await yieldToUi();
        return true;
      },
    );
    if (!section) {
      for (const s of built) s.remove();
      return {status: 'cancelled'};
    }
    built.push(section);
  }
  for (const route of routes) {
    for (const theme of route.themes) {
      for (const group of theme.groups) {
        for (const item of group.items) {
          if (item.sourceId) copies++;
          else gaps++;
        }
      }
    }
  }

  // Replace: drop the old sections of rebuilt routes and of routes that
  // are no longer in the plan.
  const keep = new Set<BaseNode>(built);
  const inPlan = new Set(plan.map(r => r.key));
  const rebuilt = new Set(routes.map(r => r.key));
  for (const node of [...page.children]) {
    if (roleOf(node) !== ROLE_ROUTE || keep.has(node)) continue;
    const key = node.getSharedPluginData(NAMESPACE, ROUTE_KEY);
    if (rebuilt.has(key) || !inPlan.has(key)) node.remove();
  }
  stack(
    page,
    plan.map(r => r.key),
  );
  options.onProgress({done: total, total, label: 'Done'});

  if (figma.currentPage.id !== page.id) await figma.setCurrentPageAsync(page);
  if (built.length > 0) figma.viewport.scrollAndZoomIntoView(built);
  return {status: 'built', pageId: page.id, routes: built.length, copies, gaps};
}
