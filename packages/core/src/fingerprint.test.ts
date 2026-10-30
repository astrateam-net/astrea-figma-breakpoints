import {describe, expect, test} from 'bun:test';
import {
  diffBuild,
  hashString,
  routeFingerprint,
  settingsFingerprint,
} from './fingerprint';
import {buildPlan} from './plan';
import {buildRouteTable, type ScannedFrame} from './routes';
import {defaultSettings} from './settings';

describe('hashString', () => {
  test('stable, 8 hex characters, differs for different input', () => {
    expect(hashString('Home')).toBe(hashString('Home'));
    expect(hashString('Home')).toMatch(/^[0-9a-f]{8}$/);
    expect(hashString('Home')).not.toBe(hashString('Home - Mobile'));
  });
});

describe('settingsFingerprint', () => {
  test('changes when a device is checked, not when an unchecked one moves', () => {
    const base = defaultSettings();
    const checked = {
      ...base,
      devices: base.devices.map(d =>
        d.id === 'small-phone' ? {...d, enabled: true} : d,
      ),
    };
    const renamedOff = {
      ...base,
      devices: base.devices.map(d =>
        d.id === 'small-phone' ? {...d, name: 'Tiny'} : d,
      ),
    };
    expect(settingsFingerprint(checked)).not.toBe(settingsFingerprint(base));
    expect(settingsFingerprint(renamedOff)).toBe(settingsFingerprint(base));
  });
});

describe('routeFingerprint', () => {
  const settings = defaultSettings();
  const frames: ScannedFrame[] = [
    {id: '1', name: 'Home', width: 1280, sections: [], modes: {}},
  ];
  const [route] = buildPlan(
    buildRouteTable(frames, settings.breakpoints),
    settings,
  );
  if (!route) throw new Error('no route');
  const hash = settingsFingerprint(settings);

  test('changes when a source frame changes structure', () => {
    expect(routeFingerprint(route, hash, {'1': 'a'})).toBe(
      routeFingerprint(route, hash, {'1': 'a'}),
    );
    expect(routeFingerprint(route, hash, {'1': 'a'})).not.toBe(
      routeFingerprint(route, hash, {'1': 'b'}),
    );
  });

  test('changes with the settings', () => {
    expect(routeFingerprint(route, hash, {})).not.toBe(
      routeFingerprint(route, 'other', {}),
    );
  });
});

describe('diffBuild', () => {
  test('new, changed and removed routes', () => {
    expect(
      diffBuild(
        {Home: 'a', Cart: 'b', Old: 'c'},
        {Home: 'a', Cart: 'x', Account: 'd'},
      ),
    ).toEqual([
      {route: 'Cart', kind: 'changed'},
      {route: 'Account', kind: 'new'},
      {route: 'Old', kind: 'removed'},
    ]);
  });

  test('nothing changed', () => {
    expect(diffBuild({Home: 'a'}, {Home: 'a'})).toEqual([]);
  });
});
