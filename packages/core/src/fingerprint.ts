import type {PlanRoute} from './plan';
import type {Settings} from './settings';

/** Short stable hash (FNV-1a, 32 bit) of a string, as 8 hex characters. */
export function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * The settings that change what a build looks like. Manual picks and the
 * page are covered by the plan itself (they change the source frames).
 */
export function settingsFingerprint(settings: Settings): string {
  return hashString(
    JSON.stringify([
      settings.breakpoints.map(b => [b.id, b.name, b.suffix, b.minWidth]),
      settings.devices
        .filter(d => d.enabled)
        .map(d => [d.id, d.name, d.width, d.height, d.breakpointId]),
      settings.theme.collectionKey,
      settings.theme.modeNames,
    ]),
  );
}

/**
 * What one route section was built from: the settings, which frame each
 * device shows, and the structure of those frames (`sources`: frame id →
 * its structure signature). Block edits inside instances don't change it:
 * copies hold instances, so those show up without a rebuild.
 */
export function routeFingerprint(
  route: PlanRoute,
  settingsHash: string,
  sources: Record<string, string>,
): string {
  const items = route.themes.map(theme => [
    theme.mode,
    theme.groups.map(group =>
      group.items.map(item => [
        item.device.id,
        item.sourceId,
        item.sourceId ? (sources[item.sourceId] ?? '') : '',
      ]),
    ),
  ]);
  return hashString(JSON.stringify([settingsHash, items]));
}

export interface BuildChange {
  route: string;
  kind: 'new' | 'changed' | 'removed';
}

/** Routes to rebuild or remove, comparing the built page with the plan. */
export function diffBuild(
  built: Record<string, string>,
  current: Record<string, string>,
): BuildChange[] {
  const changes: BuildChange[] = [];
  for (const [route, fingerprint] of Object.entries(current)) {
    if (!(route in built)) changes.push({route, kind: 'new'});
    else if (built[route] !== fingerprint) {
      changes.push({route, kind: 'changed'});
    }
  }
  for (const route of Object.keys(built)) {
    if (!(route in current)) changes.push({route, kind: 'removed'});
  }
  return changes;
}
