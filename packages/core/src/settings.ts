import {DEVICE_CATALOG, type Device} from './devices';

/** Bump when the stored shape changes; `normalizeSettings` upgrades older data. */
export const SETTINGS_VERSION = 1;

export interface Breakpoint {
  id: string;
  name: string;
  /** Frame name ends with ` - <suffix>`; null = frames without a suffix. */
  suffix: string | null;
  /** A device uses the widest breakpoint whose `minWidth` it reaches. */
  minWidth: number;
}

export interface ThemeSettings {
  /** `VariableCollection.key`: the same in every file that uses the library. */
  collectionKey: string | null;
  collectionName: string | null;
  /** Modes to build, by name (mode IDs differ between files). */
  modeNames: string[];
}

/** route key → breakpoint id → frame id, or null for "no frame". */
export type Overrides = Record<string, Record<string, string | null>>;

export interface Settings {
  version: number;
  pageId: string | null;
  breakpoints: Breakpoint[];
  devices: Device[];
  theme: ThemeSettings;
  overrides: Overrides;
}

/** Defaults follow the AstraMotors website; every value is editable. */
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  {id: 'mobile', name: 'Mobile', suffix: 'Mobile', minWidth: 320},
  {id: 'tablet', name: 'Tablet', suffix: 'Tablet', minWidth: 600},
  {id: 'tablet-l', name: 'Tablet L', suffix: 'Tablet L', minWidth: 960},
  {id: 'desktop', name: 'Desktop', suffix: null, minWidth: 1280},
  {id: 'wide', name: 'Wide', suffix: 'Wide', minWidth: 1920},
];

export function defaultSettings(): Settings {
  return {
    version: SETTINGS_VERSION,
    pageId: null,
    breakpoints: DEFAULT_BREAKPOINTS.map(b => ({...b})),
    devices: DEVICE_CATALOG.map(d => ({...d})),
    theme: {collectionKey: null, collectionName: null, modeNames: []},
    overrides: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBreakpoint(value: unknown): value is Breakpoint {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.suffix === 'string' || value.suffix === null) &&
    typeof value.minWidth === 'number'
  );
}

function isDevice(value: unknown): value is Device {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.group === 'phone' ||
      value.group === 'tablet' ||
      value.group === 'computer') &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.enabled === 'boolean'
  );
}

function normalizeOverrides(value: unknown): Overrides {
  if (!isRecord(value)) return {};
  const result: Overrides = {};
  for (const [route, cells] of Object.entries(value)) {
    if (!isRecord(cells)) continue;
    const kept: Record<string, string | null> = {};
    for (const [breakpointId, frameId] of Object.entries(cells)) {
      if (typeof frameId === 'string' || frameId === null) {
        kept[breakpointId] = frameId;
      }
    }
    result[route] = kept;
  }
  return result;
}

/**
 * Turns whatever is stored (older versions, hand-edited JSON, an import)
 * into valid settings: unknown keys are dropped, invalid entries skipped,
 * missing parts taken from the defaults.
 */
export function normalizeSettings(raw: unknown): Settings {
  const defaults = defaultSettings();
  if (!isRecord(raw)) return defaults;

  const breakpoints = Array.isArray(raw.breakpoints)
    ? raw.breakpoints.filter(isBreakpoint)
    : [];
  const devices = Array.isArray(raw.devices)
    ? raw.devices.filter(isDevice)
    : [];
  const theme = isRecord(raw.theme) ? raw.theme : {};

  return {
    version: SETTINGS_VERSION,
    pageId: typeof raw.pageId === 'string' ? raw.pageId : null,
    breakpoints: sortBreakpoints(
      breakpoints.length > 0 ? breakpoints : defaults.breakpoints,
    ),
    devices: devices.length > 0 ? devices : defaults.devices,
    theme: {
      collectionKey:
        typeof theme.collectionKey === 'string' ? theme.collectionKey : null,
      collectionName:
        typeof theme.collectionName === 'string' ? theme.collectionName : null,
      modeNames: Array.isArray(theme.modeNames)
        ? theme.modeNames.filter((m): m is string => typeof m === 'string')
        : [],
    },
    overrides: normalizeOverrides(raw.overrides),
  };
}

export function sortBreakpoints(breakpoints: Breakpoint[]): Breakpoint[] {
  return [...breakpoints].sort((a, b) => a.minWidth - b.minWidth);
}

/** The breakpoint whose frames a screen of this width shows. */
export function breakpointForWidth(
  width: number,
  breakpoints: Breakpoint[],
): Breakpoint | null {
  const sorted = sortBreakpoints(breakpoints);
  let match = sorted[0] ?? null;
  for (const breakpoint of sorted) {
    if (width >= breakpoint.minWidth) match = breakpoint;
  }
  return match;
}

export function breakpointForDevice(
  device: Device,
  breakpoints: Breakpoint[],
): Breakpoint | null {
  if (device.breakpointId) {
    const chosen = breakpoints.find(b => b.id === device.breakpointId);
    if (chosen) return chosen;
  }
  return breakpointForWidth(device.width, breakpoints);
}

/** Problems that block saving the breakpoints, keyed by breakpoint id. */
export function validateBreakpoints(
  breakpoints: Breakpoint[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  const widths = new Map<number, string>();
  const suffixes = new Map<string, string>();
  for (const breakpoint of breakpoints) {
    const suffix = breakpoint.suffix ?? '';
    if (breakpoint.name.trim() === '') {
      errors[breakpoint.id] = 'Name is empty';
    } else if (
      !Number.isInteger(breakpoint.minWidth) ||
      breakpoint.minWidth < 0
    ) {
      errors[breakpoint.id] = 'Width must be a whole number';
    } else if (widths.has(breakpoint.minWidth)) {
      errors[breakpoint.id] =
        `Same width as ${widths.get(breakpoint.minWidth) ?? 'another'}`;
    } else if (suffixes.has(suffix)) {
      errors[breakpoint.id] = suffix
        ? `Same suffix as ${suffixes.get(suffix) ?? 'another'}`
        : 'Only one breakpoint can have no suffix';
    }
    widths.set(breakpoint.minWidth, breakpoint.name);
    suffixes.set(suffix, breakpoint.name);
  }
  return errors;
}
