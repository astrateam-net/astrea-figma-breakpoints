import {parseFrameName} from './frame-name';
import type {Breakpoint, Overrides} from './settings';

/** A top-level frame as the plugin found it on the page. */
export interface ScannedFrame {
  id: string;
  name: string;
  width: number;
  /** Names of the sections the frame sits in, outermost first. */
  sections: string[];
  /** Mode name in the chosen theme collection; null = not set on the frame. */
  theme: string | null;
}

export interface CellFrame {
  id: string;
  theme: string | null;
}

export interface RouteCell {
  frames: CellFrame[];
  /** auto = matched by name, manual = picked by the user, none = no frame. */
  source: 'auto' | 'manual' | 'none';
}

export interface RouteRow {
  /** `Route — State`: the frame name without the breakpoint suffix. */
  key: string;
  route: string;
  state: string | null;
  /** Outermost section, e.g. the zone `Public`. */
  zone: string | null;
  cells: Record<string, RouteCell>;
}

function rowKey(route: string, state: string | null): string {
  return state ? `${route} — ${state}` : route;
}

/**
 * Groups frames into rows (route + state) and columns (breakpoints) by name,
 * then applies the user's manual picks. Rows keep the order of the page.
 */
export function buildRouteTable(
  frames: ScannedFrame[],
  breakpoints: Breakpoint[],
  overrides: Overrides = {},
): RouteRow[] {
  const suffixes = breakpoints
    .map(b => b.suffix)
    .filter((s): s is string => s !== null);
  const base = breakpoints.find(b => b.suffix === null) ?? null;
  const byId = new Map(frames.map(f => [f.id, f]));
  const rows = new Map<string, RouteRow>();

  function rowFor(route: string, state: string | null, zone: string | null) {
    const key = rowKey(route, state);
    let row = rows.get(key);
    if (!row) {
      const cells: Record<string, RouteCell> = {};
      for (const b of breakpoints) cells[b.id] = {frames: [], source: 'none'};
      row = {key, route, state, zone, cells};
      rows.set(key, row);
    }
    return row;
  }

  for (const frame of frames) {
    const parsed = parseFrameName(frame.name, suffixes);
    const breakpoint = parsed.breakpoint
      ? breakpoints.find(b => b.suffix === parsed.breakpoint)
      : base;
    if (!breakpoint) continue;
    const row = rowFor(parsed.route, parsed.state, frame.sections[0] ?? null);
    const cell = row.cells[breakpoint.id];
    if (!cell) continue;
    cell.frames.push({id: frame.id, theme: frame.theme});
    cell.source = 'auto';
  }

  for (const [key, cells] of Object.entries(overrides)) {
    const row = rows.get(key);
    if (!row) continue;
    for (const [breakpointId, frameId] of Object.entries(cells)) {
      if (!(breakpointId in row.cells)) continue;
      const frame = frameId ? byId.get(frameId) : undefined;
      row.cells[breakpointId] = frame
        ? {frames: [{id: frame.id, theme: frame.theme}], source: 'manual'}
        : {frames: [], source: 'none'};
    }
  }

  return [...rows.values()];
}
