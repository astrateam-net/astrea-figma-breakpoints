import {
  countPlan,
  type DeviceGroup,
  type PlanItem,
  type PlanRoute,
} from '@astrea/breakpoints-core';
import {ROLE_KEY} from './scan';
import {NAMESPACE} from './storage';

/** Name of the page the plugin builds on (created when missing). */
export const CHECK_PAGE_NAME = 'Responsive QA';

const ROLE_PAGE = 'check-page';
const ROLE_ROUTE = 'route';
const SOURCE_KEY = 'source';

const PADDING = 120;
const COPY_GAP = 80;
const ROW_GAP = 160;
const LABEL_GAP = 16;
const ROUTE_GAP = 400;
const FONT: FontName = {family: 'Inter', style: 'Regular'};
const FONT_BOLD: FontName = {family: 'Inter', style: 'Semi Bold'};
const GREY: RGB = {r: 0.55, g: 0.55, b: 0.58};
const FOLD: RGB = {r: 0.85, g: 0.16, b: 0.11};

const GROUP_TITLE: Record<DeviceGroup, string> = {
  phone: 'Phones',
  tablet: 'Tablets',
  computer: 'Computers',
};

export interface BuildResult {
  pageId: string;
  copies: number;
  gaps: number;
}

function mark(node: BaseNode, role: string): void {
  node.setSharedPluginData(NAMESPACE, ROLE_KEY, role);
}

function roleOf(node: BaseNode): string {
  return node.getSharedPluginData(NAMESPACE, ROLE_KEY);
}

async function checkPage(sourcePage: PageNode): Promise<PageNode> {
  const pages = figma.root.children;
  const page =
    pages.find(p => roleOf(p) === ROLE_PAGE) ??
    pages.find(p => p.name === CHECK_PAGE_NAME);
  if (page) {
    mark(page, ROLE_PAGE);
    await page.loadAsync();
    return page;
  }
  const created = figma.createPage();
  created.name = CHECK_PAGE_NAME;
  figma.root.insertChild(pages.indexOf(sourcePage) + 1, created);
  mark(created, ROLE_PAGE);
  return created;
}

function text(characters: string, bold = false, size = 24): TextNode {
  const node = figma.createText();
  node.fontName = bold ? FONT_BOLD : FONT;
  node.fontSize = size;
  node.characters = characters;
  node.fills = [{type: 'SOLID', color: GREY}];
  return node;
}

function placeholder(item: PlanItem): FrameNode {
  const frame = figma.createFrame();
  frame.resize(item.device.width, item.device.height);
  frame.fills = [{type: 'SOLID', color: {r: 0.93, g: 0.93, b: 0.94}}];
  frame.name = `No frame for ${item.breakpoint?.name ?? 'this width'}`;
  const label = text(frame.name);
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

/** Bottom edge of everything on the page that the plugin did not build. */
function contentBottom(page: PageNode): number {
  let bottom = 0;
  for (const node of page.children) {
    if (roleOf(node) === ROLE_ROUTE) continue;
    bottom = Math.max(bottom, node.y + node.height + ROUTE_GAP);
  }
  return bottom;
}

/**
 * Builds the check page: one section per route, a row of device-sized
 * copies per theme and device group, labelled, with the fold (device height)
 * marked. The previous build is removed only after the new one is complete.
 */
export async function buildCheckPage(
  plan: PlanRoute[],
  sourcePage: PageNode,
): Promise<BuildResult> {
  await Promise.all([
    figma.loadFontAsync(FONT),
    figma.loadFontAsync(FONT_BOLD),
  ]);
  const page = await checkPage(sourcePage);
  const previous = page.children.filter(n => roleOf(n) === ROLE_ROUTE);
  const sections: SectionNode[] = [];
  let top = contentBottom(page);

  for (const route of plan) {
    const section = figma.createSection();
    section.name = route.key;
    mark(section, ROLE_ROUTE);
    page.appendChild(section);
    let y = PADDING;
    let width = 0;

    for (const theme of route.themes) {
      for (const group of theme.groups) {
        const title = text(
          theme.mode
            ? `${GROUP_TITLE[group.group]} · ${theme.mode}`
            : GROUP_TITLE[group.group],
          true,
          40,
        );
        section.appendChild(title);
        title.x = PADDING;
        title.y = y;
        y += title.height + LABEL_GAP * 2;

        let x = PADDING;
        let rowHeight = 0;
        for (const item of group.items) {
          const node = (await copy(item)) ?? placeholder(item);
          const sourceName = item.sourceId ? `${node.name}` : 'no frame';
          node.name = `${item.device.name} · ${sourceName}`;
          const label = text(
            `${item.device.name} · ${item.device.width} × ${item.device.height} · ${sourceName}`,
          );
          section.appendChild(label);
          section.appendChild(node);
          label.x = x;
          label.y = y;
          node.x = x;
          node.y = y + label.height + LABEL_GAP;

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

          x += Math.max(item.device.width, label.width) + COPY_GAP;
          rowHeight = Math.max(
            rowHeight,
            label.height + LABEL_GAP + node.height,
          );
        }
        width = Math.max(width, x - COPY_GAP + PADDING);
        y += rowHeight + ROW_GAP;
      }
    }

    section.resizeWithoutConstraints(width, y - ROW_GAP + PADDING);
    section.x = 0;
    section.y = top;
    top += section.height + ROUTE_GAP;
    sections.push(section);
  }

  for (const node of previous) node.remove();

  if (figma.currentPage.id !== page.id) await figma.setCurrentPageAsync(page);
  if (sections.length > 0) figma.viewport.scrollAndZoomIntoView(sections);

  return {pageId: page.id, ...countPlan(plan)};
}
