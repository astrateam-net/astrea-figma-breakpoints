import {describe, expect, test} from 'bun:test';
import {formatFrameName, parseFrameName} from './frame-name';

describe('parseFrameName', () => {
  test.each([
    ['Home', {route: 'Home', state: null, breakpoint: null}],
    ['Home - Mobile', {route: 'Home', state: null, breakpoint: 'Mobile'}],
    ['Home - Tablet L', {route: 'Home', state: null, breakpoint: 'Tablet L'}],
    ['Home - Tablet', {route: 'Home', state: null, breakpoint: 'Tablet'}],
    ['Home — Signed in', {route: 'Home', state: 'Signed in', breakpoint: null}],
    [
      'Cart / Booking — Step 2 Time - Mobile',
      {route: 'Cart / Booking', state: 'Step 2 Time', breakpoint: 'Mobile'},
    ],
    [
      'Account / Garage — Empty - Tablet L',
      {route: 'Account / Garage', state: 'Empty', breakpoint: 'Tablet L'},
    ],
  ])('%s', (name, expected) => {
    expect(parseFrameName(name)).toEqual(expected);
  });

  test('an unknown suffix stays part of the route', () => {
    expect(parseFrameName('Home - Watch')).toEqual({
      route: 'Home - Watch',
      state: null,
      breakpoint: null,
    });
  });

  test('custom suffixes', () => {
    expect(parseFrameName('Home - SM', ['SM', 'MD']).breakpoint).toBe('SM');
  });

  test('format is the inverse of parse', () => {
    for (const name of [
      'Home',
      'Home - Wide',
      'Cart / Booking — Step 2 Time - Mobile',
    ]) {
      expect(formatFrameName(parseFrameName(name))).toBe(name);
    }
  });
});
