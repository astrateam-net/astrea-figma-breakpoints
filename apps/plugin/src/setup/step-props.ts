import type {RouteRow, Settings} from '@astrea/breakpoints-core';
import type {PluginState} from '../types';

/** What every setup step gets: the scan, the draft settings and the table. */
export interface StepProps {
  state: PluginState;
  draft: Settings;
  setDraft: (next: Settings) => void;
  /** Route table for the draft (recomputed on every change). */
  rows: RouteRow[];
}

/** Frames found per breakpoint id in the route table. */
export function framesPerBreakpoint(rows: RouteRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const [id, cell] of Object.entries(row.cells)) {
      counts.set(id, (counts.get(id) ?? 0) + cell.frames.length);
    }
  }
  return counts;
}

export function plural(count: number, word: string, many = `${word}s`): string {
  return `${count} ${count === 1 ? word : many}`;
}
