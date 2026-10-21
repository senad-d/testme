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

  it('throws RangeError for reversed bounds', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError);
  });
});
