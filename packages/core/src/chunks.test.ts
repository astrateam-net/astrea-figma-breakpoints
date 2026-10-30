import {expect, test} from 'bun:test';
import {splitChunks} from './chunks';

test('splits and joins back', () => {
  const value = 'абв'.repeat(10_001);
  const chunks = splitChunks(value, 7_000);
  expect(chunks.length).toBe(5);
  expect(chunks.every(c => c.length <= 7_000)).toBe(true);
  expect(chunks.join('')).toBe(value);
});

test('empty value is one empty chunk', () => {
  expect(splitChunks('')).toEqual(['']);
});
