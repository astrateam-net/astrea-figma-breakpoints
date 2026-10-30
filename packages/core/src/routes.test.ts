import {describe, expect, test} from 'bun:test';
import {buildRouteTable, type ScannedFrame} from './routes';
import {DEFAULT_BREAKPOINTS} from './settings';

function frame(
  id: string,
  name: string,
  theme: string | null = 'Light',
  sections = ['Public', 'Home'],
): ScannedFrame {
  return {id, name, width: 0, sections, modes: theme ? {mode: theme} : {}};
}

const frames: ScannedFrame[] = [
  frame('1', 'Home'),
  frame('2', 'Home - Tablet L'),
  frame('3', 'Home - Tablet'),
  frame('4', 'Home - Mobile'),
  frame('5', 'Home', 'Dark'),
  frame('6', 'Home - Wide'),
  frame('7', 'Home — Signed in'),
  frame('8', 'Account / Garage', 'Light', ['Account', 'Account / Garage']),
];

describe('buildRouteTable', () => {
  const rows = buildRouteTable(frames, DEFAULT_BREAKPOINTS, {}, 'mode');

  test('one row per route and state, in page order', () => {
    expect(rows.map(r => r.key)).toEqual([
      'Home',
      'Home — Signed in',
      'Account / Garage',
    ]);
  });

  test('frames land in their breakpoint, Light and Dark together', () => {
    const home = rows[0];
    expect(home?.zone).toBe('Public');
    expect(home?.cells.desktop?.frames).toEqual([
      {id: '1', theme: 'Light'},
      {id: '5', theme: 'Dark'},
    ]);
    expect(home?.cells['tablet-l']?.frames.map(f => f.id)).toEqual(['2']);
    expect(home?.cells.tablet?.frames.map(f => f.id)).toEqual(['3']);
    expect(home?.cells.mobile?.frames.map(f => f.id)).toEqual(['4']);
    expect(home?.cells.wide?.source).toBe('auto');
  });

  test('missing breakpoints are empty', () => {
    const garage = rows[2];
    expect(garage?.zone).toBe('Account');
    expect(garage?.cells.desktop?.source).toBe('auto');
    expect(garage?.cells.mobile).toEqual({frames: [], source: 'none'});
  });

  test('a manual pick replaces the cell; null clears it', () => {
    const fixed = buildRouteTable(
      frames,
      DEFAULT_BREAKPOINTS,
      {
        'Account / Garage': {mobile: '4', desktop: null},
        Unknown: {mobile: '1'},
      },
      'mode',
    );
    const garage = fixed.find(r => r.key === 'Account / Garage');
    expect(garage?.cells.mobile).toEqual({
      frames: [{id: '4', theme: 'Light'}],
      source: 'manual',
    });
    expect(garage?.cells.desktop).toEqual({frames: [], source: 'none'});
  });

  test('without a theme collection every theme is null', () => {
    const plain = buildRouteTable(frames, DEFAULT_BREAKPOINTS);
    expect(plain[0]?.cells.mobile?.frames).toEqual([{id: '4', theme: null}]);
  });

  test('a pick of a deleted frame shows as no frame', () => {
    const fixed = buildRouteTable(frames, DEFAULT_BREAKPOINTS, {
      Home: {mobile: '999'},
    });
    expect(fixed[0]?.cells.mobile).toEqual({frames: [], source: 'none'});
  });
});
