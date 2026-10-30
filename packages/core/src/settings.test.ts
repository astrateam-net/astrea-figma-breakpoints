import {describe, expect, test} from 'bun:test';
import {DEVICE_CATALOG} from './devices';
import {
  breakpointForDevice,
  breakpointForWidth,
  DEFAULT_BREAKPOINTS,
  defaultSettings,
  normalizeSettings,
  SETTINGS_VERSION,
} from './settings';

describe('breakpointForWidth', () => {
  test.each([
    [320, 'mobile'],
    [393, 'mobile'],
    [599, 'mobile'],
    [600, 'tablet'],
    [834, 'tablet'],
    [960, 'tablet-l'],
    [1024, 'tablet-l'],
    [1280, 'desktop'],
    [1512, 'desktop'],
    [1920, 'wide'],
  ])('%i → %s', (width, id) => {
    expect(breakpointForWidth(width, DEFAULT_BREAKPOINTS)?.id).toBe(id);
  });

  test('narrower than every breakpoint falls back to the smallest', () => {
    expect(breakpointForWidth(280, DEFAULT_BREAKPOINTS)?.id).toBe('mobile');
  });

  test('order of the list does not matter', () => {
    const shuffled = [...DEFAULT_BREAKPOINTS].reverse();
    expect(breakpointForWidth(700, shuffled)?.id).toBe('tablet');
  });

  test('no breakpoints → null', () => {
    expect(breakpointForWidth(400, [])).toBeNull();
  });
});

describe('breakpointForDevice', () => {
  const ipad = DEVICE_CATALOG.find(d => d.id === 'ipad-pro-13');
  if (!ipad) throw new Error('catalog lost iPad Pro 12.9');

  test('by width', () => {
    expect(breakpointForDevice(ipad, DEFAULT_BREAKPOINTS)?.id).toBe('tablet-l');
  });

  test('a manual pick wins over width', () => {
    const device = {...ipad, breakpointId: 'tablet'};
    expect(breakpointForDevice(device, DEFAULT_BREAKPOINTS)?.id).toBe('tablet');
  });

  test('a pick of a deleted breakpoint falls back to width', () => {
    const device = {...ipad, breakpointId: 'gone'};
    expect(breakpointForDevice(device, DEFAULT_BREAKPOINTS)?.id).toBe(
      'tablet-l',
    );
  });
});

describe('normalizeSettings', () => {
  test('nothing stored → defaults', () => {
    expect(normalizeSettings(undefined)).toEqual(defaultSettings());
    expect(normalizeSettings('garbage')).toEqual(defaultSettings());
  });

  test('keeps valid values, drops invalid entries, sorts breakpoints', () => {
    const settings = normalizeSettings({
      version: 0,
      pageId: '1:2',
      breakpoints: [
        {id: 'l', name: 'Large', suffix: null, minWidth: 1000},
        {id: 's', name: 'Small', suffix: 'S', minWidth: 0},
        {id: 'bad', name: 'Bad', minWidth: 'wide'},
      ],
      theme: {collectionKey: 'abc', modeNames: ['Light', 5]},
      overrides: {Home: {s: '3:4', l: null, x: 7}, Broken: 1},
      unknown: true,
    });
    expect(settings.version).toBe(SETTINGS_VERSION);
    expect(settings.pageId).toBe('1:2');
    expect(settings.breakpoints.map(b => b.id)).toEqual(['s', 'l']);
    expect(settings.devices).toEqual(defaultSettings().devices);
    expect(settings.theme).toEqual({
      collectionKey: 'abc',
      collectionName: null,
      modeNames: ['Light'],
    });
    expect(settings.overrides).toEqual({Home: {s: '3:4', l: null}});
    expect('unknown' in settings).toBe(false);
  });

  test('survives a JSON round trip', () => {
    const settings = defaultSettings();
    expect(normalizeSettings(JSON.parse(JSON.stringify(settings)))).toEqual(
      settings,
    );
  });
});
