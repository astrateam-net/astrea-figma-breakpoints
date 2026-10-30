import type {Device, DeviceGroup} from './devices';
import type {RouteRow} from './routes';
import {type Breakpoint, breakpointForDevice, type Settings} from './settings';

/** One device-sized copy on the check page. */
export interface PlanItem {
  device: Device;
  breakpoint: Breakpoint | null;
  /** Frame to copy; null = draw a "no frame" placeholder. */
  sourceId: string | null;
}

export interface PlanGroup {
  group: DeviceGroup;
  items: PlanItem[];
}

/** Copies of one route in one theme mode (null = no theme collection). */
export interface PlanTheme {
  mode: string | null;
  groups: PlanGroup[];
}

export interface PlanRoute {
  key: string;
  themes: PlanTheme[];
}

export const GROUP_ORDER: readonly DeviceGroup[] = [
  'phone',
  'tablet',
  'computer',
];

/**
 * What the check page holds: for every route, theme mode and checked device,
 * the frame to copy (the device's breakpoint, in that mode) or a gap.
 */
export function buildPlan(rows: RouteRow[], settings: Settings): PlanRoute[] {
  const modes: Array<string | null> =
    settings.theme.collectionKey && settings.theme.modeNames.length > 0
      ? settings.theme.modeNames
      : [null];
  const devices = settings.devices
    .filter(d => d.enabled)
    .sort((a, b) => a.width - b.width);

  return rows.map(row => ({
    key: row.key,
    themes: modes.map(mode => ({
      mode,
      groups: GROUP_ORDER.map(group => ({
        group,
        items: devices
          .filter(d => d.group === group)
          .map(device => {
            const breakpoint = breakpointForDevice(
              device,
              settings.breakpoints,
            );
            const frames = breakpoint
              ? (row.cells[breakpoint.id]?.frames ?? [])
              : [];
            // A frame without a mode in the theme collection stands in for
            // any mode that has no frame of its own.
            const source =
              mode === null
                ? frames[0]
                : (frames.find(f => f.theme === mode) ??
                  frames.find(f => f.theme === null));
            return {device, breakpoint, sourceId: source?.id ?? null};
          }),
      })).filter(g => g.items.length > 0),
    })),
  }));
}

/** Number of copies and of gaps in a plan. */
export function countPlan(plan: PlanRoute[]): {copies: number; gaps: number} {
  let copies = 0;
  let gaps = 0;
  for (const route of plan) {
    for (const theme of route.themes) {
      for (const group of theme.groups) {
        for (const item of group.items) {
          if (item.sourceId) copies++;
          else gaps++;
        }
      }
    }
  }
  return {copies, gaps};
}
