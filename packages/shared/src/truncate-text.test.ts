import { describe, expect, it } from 'vitest';

import { truncateText } from './index.js';

describe('truncateText', () => {
  it.each([
    ['', 0, ''],
    ['', 4, ''],
    ['abc', 4, 'abc'],
    ['abcd', 4, 'abcd'],
    [' \tabc\n ', 7, ' \tabc\n '],
    [' \tabc\n ', 4, ' \ta…'],
    ['abcdef', 4, 'abc…'],
    ['abc', 0, ''],
    ['abc', 1, '…'],
    ['a', 1, 'a'],
    ['😀abc', 3, '😀a…'],
    ['😀a', 2, '😀a'],
    ['😀', 1, '😀'],
    ['😀a', 1, '…'],
    ['e\u0301ab', 3, 'e\u0301…'],
    ['abc', Number.MAX_SAFE_INTEGER, 'abc'],
  ] as const)('truncates %j at limit %i to %j', (text, max, expected) => {
    const result = truncateText(text, max);

    expect(result).toBe(expected);
    expect(Array.from(result).length).toBeLessThanOrEqual(max);
  });

  describe.each([-1, -0.5, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'invalid limit %s',
    (max) => {
      it.each(['', 'synthetic-private-text'])(
        'rejects input %j with a fixed RangeError',
        (text) => {
          const action = () => truncateText(text, max);

          expect(action).toThrow(RangeError);
          expect(action).toThrow('max must be a nonnegative safe integer.');
          try {
            action();
          } catch (error) {
            expect(error).toMatchObject({
              name: 'RangeError',
              message: 'max must be a nonnegative safe integer.',
            });
            if (text !== '') {
              expect(String(error)).not.toContain(text);
            }
          }
        },
      );
    },
  );
});
