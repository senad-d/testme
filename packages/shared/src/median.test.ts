import { describe, expect, it } from 'vitest';

import { median } from './index.js';

describe('median', () => {
  it.each([
    { values: [3, 1, 2], expected: 2 },
    { values: [4, 1, 2, 3], expected: 2.5 },
    { values: [7], expected: 7 },
    { values: [0], expected: 0 },
    { values: [2, 0], expected: 1 },
    { values: [3, 2, 2, 1], expected: 2 },
    { values: [-1.5, -4.5, -3], expected: -3 },
    { values: [1.5, -4.5, -1.5, 0.5], expected: -0.5 },
    { values: [10, 2, 3], expected: 3 },
    { values: [20, 1, 10, 3], expected: 6.5 },
  ])('returns $expected for $values', ({ values, expected }) => {
    expect(median(values)).toBe(expected);
  });

  it('rejects an empty array with a fixed RangeError', () => {
    const action = () => median([]);

    expect(action).toThrow(RangeError);
    expect(action).toThrow(/^values must not be empty\.$/);
  });

  it.each([{ values: [3, 1, 2] }, { values: [4, 1, 2, 3] }])(
    'preserves the caller array for input $values',
    ({ values }) => {
      const original = [...values];

      median(values);

      expect(values).toEqual(original);
    },
  );
});
