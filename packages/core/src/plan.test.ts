import {describe, expect, test} from 'bun:test';
import {buildPlan, countPlan} from './plan';
import {buildRouteTable, type ScannedFrame} from './routes';
import {defaultSettings, type Settings} from './settings';

function frame(id: string, name: string, mode: string): ScannedFrame {
  return {id, name, width: 0, sections: ['Public'], modes: {theme: mode}};
}

const frames = [
  frame('d-l', 'Home', 'Light'),
  frame('d-d', 'Home', 'Dark'),
  frame('t-l', 'Home - Tablet', 'Light'),
  frame('m-l', 'Home - Mobile', 'Light'),
];

function settings(modeNames: string[]): Settings {
  const s = defaultSettings();
  return {
    ...s,
    theme: {collectionKey: 'theme', collectionName: 'Mode', modeNames},
  };
}

function plan(modeNames: string[]) {
  const s = settings(modeNames);
  const rows = buildRouteTable(frames, s.breakpoints, {}, 'theme');
  return buildPlan(rows, s);
}

describe('buildPlan', () => {
  test('devices grouped and sorted by width, each with its breakpoint frame', () => {
    const [home] = plan(['Light']);
    const groups = home?.themes[0]?.groups ?? [];
    expect(groups.map(g => g.group)).toEqual(['phone', 'tablet', 'computer']);
    const phones = groups[0]?.items ?? [];
    expect(phones.map(i => i.device.width)).toEqual([
      393, 402, 412, 420, 440, 466,
    ]);
    expect(phones.every(i => i.sourceId === 'm-l')).toBe(true);
    const tablets = groups[1]?.items ?? [];
    expect(tablets.map(i => [i.device.id, i.sourceId])).toEqual([
      ['ipad-mini', 't-l'],
      ['ipad-pro-11', 't-l'],
      ['ipad-pro-13', null],
    ]);
    expect(groups[2]?.items.every(i => i.sourceId === 'd-l')).toBe(true);
  });

  test('each mode gets its own copies; missing modes are gaps', () => {
    const [home] = plan(['Light', 'Dark']);
    const dark = home?.themes[1];
    expect(dark?.mode).toBe('Dark');
    expect(dark?.groups[0]?.items.every(i => i.sourceId === null)).toBe(true);
    expect(dark?.groups[2]?.items.every(i => i.sourceId === 'd-d')).toBe(true);
  });

  test('without a theme collection: one pass, first frame of the cell', () => {
    const s = defaultSettings();
    const rows = buildRouteTable(frames, s.breakpoints);
    const [home] = buildPlan(rows, s);
    expect(home?.themes.map(t => t.mode)).toEqual([null]);
    expect(home?.themes[0]?.groups[2]?.items[0]?.sourceId).toBe('d-l');
  });

  test('a frame without a mode stands in for a missing mode', () => {
    const s = settings(['Light', 'Dark']);
    const untagged = [
      ...frames,
      {...frame('t-x', 'Home - Tablet', ''), modes: {}},
    ];
    const rows = buildRouteTable(untagged, s.breakpoints, {}, 'theme');
    const [home] = buildPlan(rows, s);
    const darkTablets = home?.themes[1]?.groups[1]?.items ?? [];
    expect(darkTablets[0]?.sourceId).toBe('t-x');
  });

  test('countPlan', () => {
    expect(countPlan(plan(['Light']))).toEqual({copies: 11, gaps: 1});
  });
});
