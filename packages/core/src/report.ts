/** A block (direct child of a screen frame) as laid out horizontally. */
export interface BlockBox {
  id: string;
  name: string;
  x: number;
  width: number;
  /** The block scrolls horizontally on purpose (Overflow Behavior). */
  scrolls: boolean;
}

/** A screen frame: its width and its blocks in layer order. */
export interface FrameBox {
  width: number;
  blocks: BlockBox[];
}

export type FindingKind = 'gap' | 'overflow' | 'off-center' | 'not-stretched';

export interface Finding {
  kind: FindingKind;
  route: string;
  /** Theme mode, or null without a theme collection. */
  theme: string | null;
  device: string;
  /** Block name; empty for a gap. */
  block: string;
  /** Node to select: the block in the copy, or the placeholder. */
  nodeId: string;
  /** The same block in the original frame (what to fix); null for a gap. */
  sourceNodeId: string | null;
  /** How far off, in px (0 for a gap). */
  px: number;
}

/** Tolerance for rounding in Figma's layout, px. */
const EPSILON = 2;

/**
 * What went wrong when the original frame was resized to the device: blocks
 * that were centred and are not any more, that spanned the full width and
 * don't, or that stick out of the screen. Blocks are matched by layer
 * order (a copy keeps the order of its original). Only changes against the
 * original count, so a deliberate layout in the original is never flagged.
 */
export function compareFrames(
  original: FrameBox,
  copy: FrameBox,
  where: Pick<Finding, 'route' | 'theme' | 'device'>,
): Finding[] {
  const findings: Finding[] = [];
  copy.blocks.forEach((block, i) => {
    const source = original.blocks[i];
    if (!source || block.scrolls) return;
    const add = (kind: FindingKind, px: number) =>
      findings.push({
        ...where,
        kind,
        block: block.name,
        nodeId: block.id,
        sourceNodeId: source.id,
        px: Math.round(px),
      });

    // Sticking out counts only beyond what the original already does (a
    // carousel may run past the edge on purpose).
    const overflow = Math.max(-block.x, block.x + block.width - copy.width);
    const before = Math.max(
      0,
      -source.x,
      source.x + source.width - original.width,
    );
    if (overflow - before > EPSILON) {
      add('overflow', overflow);
      return;
    }

    const fullWidth =
      Math.abs(source.x) <= EPSILON &&
      Math.abs(source.width - original.width) <= EPSILON;
    if (fullWidth) {
      const missing = copy.width - block.width;
      if (missing > EPSILON) add('not-stretched', missing);
      return;
    }

    const sourceRight = original.width - source.x - source.width;
    const centred = Math.abs(source.x - sourceRight) <= EPSILON;
    if (centred) {
      const right = copy.width - block.x - block.width;
      const offset = (right - block.x) / 2;
      if (Math.abs(offset) > EPSILON) add('off-center', Math.abs(offset));
    }
  });
  return findings;
}

const TITLES: Record<FindingKind, string> = {
  overflow: 'Wider than the screen',
  'not-stretched': 'Not stretched to the edges',
  'off-center': 'Off centre',
  gap: 'No frame for this width',
};

/** Report order: real breakages first, missing frames last. */
export const FINDING_ORDER: readonly FindingKind[] = [
  'overflow',
  'not-stretched',
  'off-center',
  'gap',
];

export function findingTitle(kind: FindingKind): string {
  return TITLES[kind];
}

/**
 * The report as Markdown, to paste anywhere: what was checked and, for
 * every problem, where it is and which node of the original to fix.
 */
export function reportMarkdown(
  findings: Finding[],
  context: {file: string; page: string; devices: string[]; themes: string[]},
): string {
  const lines = [
    `# Responsive check: ${context.file}`,
    '',
    'Copies of each screen frame were resized to real device widths (the',
    `"${context.page}" page). Each problem names the block and the node to fix`,
    'in the original frame; "copy" is the same block on the check page.',
    '',
    `- Devices: ${context.devices.join(', ')}`,
    `- Themes: ${context.themes.length > 0 ? context.themes.join(', ') : 'default'}`,
    `- Problems: ${findings.length}`,
  ];
  for (const kind of FINDING_ORDER) {
    const items = findings.filter(f => f.kind === kind);
    if (items.length === 0) continue;
    lines.push('', `## ${TITLES[kind]} (${items.length})`, '');
    for (const f of items) {
      const where = [f.route, f.theme, f.device].filter(Boolean).join(' · ');
      lines.push(
        f.kind === 'gap'
          ? `- ${where}: no frame drawn for this width (placeholder ${f.nodeId})`
          : `- ${where}: "${f.block}" ${f.px} px (original ${f.sourceNodeId ?? '?'}, copy ${f.nodeId})`,
      );
    }
  }
  return `${lines.join('\n')}\n`;
}
