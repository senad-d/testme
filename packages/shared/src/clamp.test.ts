import { describe, expect, it } from 'vitest';

import { clamp } from './index.js';

describe('clamp', () => {
  it('preserves a value within the bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps a value below the minimum', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('clamps a value above the maximum', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it.each([-2.5, 3.75])('preserves the inclusive boundary %s', (boundary) => {
    expect(clamp(boundary, -2.5, 3.75)).toBe(boundary);
  });

  it.each([
    [-12.5, -10.5],
    [-6.25, -6.25],
    [-1.5, -2.5],
  ])('clamps %s within a wholly negative fractional interval to %s', (value, expected) => {
    expect(clamp(value, -10.5, -2.5)).toBe(expected);
  });

  it('throws RangeError for reversed bounds', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError);
  });
});
