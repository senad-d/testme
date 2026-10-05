import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  addGameMoney,
  formatGameMoney,
  GAME_MONEY_MAX_MINOR,
  GameMoneyError,
  multiplyGameMoney,
  parseGameMoney,
  subtractGameMoney,
  sumGameMoney,
} from './index.js';

function expectMoneyError(action: () => unknown, code: GameMoneyError['code']): void {
  expect(action).toThrow(GameMoneyError);
  expect(action).toThrow(expect.objectContaining({ code }));
}

describe('GameMoneyError diagnostics', () => {
  it('preserves literal constructor codes alongside the extended error-code union', () => {
    const empty = new GameMoneyError('EMPTY');
    const insufficient = new GameMoneyError('INSUFFICIENT');
    expectTypeOf(empty.code).toEqualTypeOf<'EMPTY'>();
    expectTypeOf(insufficient.code).toEqualTypeOf<'INSUFFICIENT'>();
    expect(empty.code).toBe('EMPTY');
    expect(insufficient.code).toBe('INSUFFICIENT');
    expect(insufficient).toBeInstanceOf(Error);
    expect(insufficient).toMatchObject({
      name: 'GameMoneyError',
      message: 'Invalid Game Money amount (INSUFFICIENT).',
    });
  });

  it.each([
    ['synthetic-private-amount', 'FORMAT'],
    ['1234567890123456.78', 'TOO_LARGE'],
  ] as const)('rejects %s without echoing the input in diagnostics', (input, code) => {
    expect.assertions(5);
    try {
      parseGameMoney(input);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GameMoneyError);
      expect(error).toMatchObject({ name: 'GameMoneyError', code });
      if (error instanceof Error) {
        expect(error.message).not.toContain(input);
        expect(String(error)).not.toContain(input);
      }
    }
  });
});

describe('parseGameMoney', () => {
  it.each([
    ['0', 0n],
    ['0.5', 50n],
    ['12.34', 1234n],
    ['007', 700n],
    ['999999999999999.99', 99999999999999999n],
    ['000000000000000', 0n],
    ['000.01', 1n],
    ['1.0', 100n],
    ['999999999999999.9', 99999999999999990n],
    ['900719925474099.93', 90071992547409993n],
  ] as const)('parses %s exactly to %s minor units', (input, expected) => {
    expect(parseGameMoney(input)).toBe(expected);
  });

  it('rejects the empty string with EMPTY', () => {
    expectMoneyError(() => parseGameMoney(''), 'EMPTY');
  });

  it.each([
    ' 1',
    '1 ',
    '+1',
    '-1',
    '1e2',
    '1,000',
    '1.',
    '.5',
    '1.234',
    '١',
    '999999999999999.995',
    ' ',
    '\t1',
    '1\t',
    '1\n',
    '1\r',
    '1\r\n',
    '1\u2028',
    '1\u2029',
    '1\u00a0',
    '1 2',
    '１',
    '1.٢',
    '1..2',
    '0x10',
    '1.2.3',
    '1\0',
    'NaN',
    'Infinity',
    '1000000000000000.001',
  ])('rejects malformed input %j with FORMAT', (input) => {
    expectMoneyError(() => parseGameMoney(input), 'FORMAT');
  });

  it.each(['1000000000000000', '1000000000000000.00', '0000000000000000'])(
    'rejects more than 15 integer digits in %s with TOO_LARGE',
    (input) => {
      expectMoneyError(() => parseGameMoney(input), 'TOO_LARGE');
    },
  );
});

describe('addGameMoney', () => {
  it.each([
    [1n, 2n, 3n],
    [0n, 0n, 0n],
    [0n, GAME_MONEY_MAX_MINOR, GAME_MONEY_MAX_MINOR],
    [GAME_MONEY_MAX_MINOR, 0n, GAME_MONEY_MAX_MINOR],
    [GAME_MONEY_MAX_MINOR - 1n, 1n, GAME_MONEY_MAX_MINOR],
    [9007199254740992n, 1n, 9007199254740993n],
  ] as const)('adds %s and %s exactly to %s minor units', (a, b, expected) => {
    expect(addGameMoney(a, b)).toBe(expected);
  });

  it.each([
    [1n, GAME_MONEY_MAX_MINOR],
    [GAME_MONEY_MAX_MINOR, 1n],
    [GAME_MONEY_MAX_MINOR, GAME_MONEY_MAX_MINOR],
  ] as const)('rejects the overflowing sum of %s and %s with TOO_LARGE', (a, b) => {
    expectMoneyError(() => addGameMoney(a, b), 'TOO_LARGE');
  });

  it('parses, adds, and formats 0.10 plus 0.20 exactly as 0.30', () => {
    expect(formatGameMoney(addGameMoney(parseGameMoney('0.10'), parseGameMoney('0.20')))).toBe(
      '0.30',
    );
  });
});

describe('sumGameMoney', () => {
  it('exposes a readonly bigint array input and bigint result through the package root', () => {
    expectTypeOf(sumGameMoney).parameters.toEqualTypeOf<[readonly bigint[]]>();
    expectTypeOf(sumGameMoney).returns.toEqualTypeOf<bigint>();
  });

  it.each([
    [[], 0n],
    [[250n], 250n],
    [[100n, 200n, 300n], 600n],
    [[0n, 0n, 0n], 0n],
    [[GAME_MONEY_MAX_MINOR], GAME_MONEY_MAX_MINOR],
    [[0n, GAME_MONEY_MAX_MINOR, 0n], GAME_MONEY_MAX_MINOR],
    [[GAME_MONEY_MAX_MINOR - 2n, 1n, 1n], GAME_MONEY_MAX_MINOR],
    [[9007199254740992n, 1n], 9007199254740993n],
    [[9007199254740993n, 1n, 1n], 9007199254740995n],
  ] as const)('sums %s exactly to %s minor units', (amounts, expected) => {
    expect(sumGameMoney(amounts)).toBe(expected);
  });

  it.each([
    [[GAME_MONEY_MAX_MINOR, 1n]],
    [[1n, GAME_MONEY_MAX_MINOR]],
    [[GAME_MONEY_MAX_MINOR - 1n, 1n, 1n]],
  ] as const)('rejects an overflowing total for %s with TOO_LARGE', (amounts) => {
    expectMoneyError(() => sumGameMoney(amounts), 'TOO_LARGE');
  });

  it.each([[[-1n]], [[1n, -1n]], [[-1n, 1n]], [[0n, 0n, -1n]]] as const)(
    'rejects a negative element in %s with NEGATIVE',
    (amounts) => {
      expectMoneyError(() => sumGameMoney(amounts), 'NEGATIVE');
    },
  );

  it.each([
    [[GAME_MONEY_MAX_MINOR + 1n]],
    [[0n, GAME_MONEY_MAX_MINOR + 1n]],
    [[10n ** 100n, 0n]],
  ] as const)('rejects an oversized element in %s with TOO_LARGE', (amounts) => {
    expectMoneyError(() => sumGameMoney(amounts), 'TOO_LARGE');
  });

  it('validates every element before any arithmetic, even after an overflowing prefix', () => {
    expectMoneyError(() => sumGameMoney([GAME_MONEY_MAX_MINOR, 1n, -1n]), 'NEGATIVE');
  });

  it('sums a frozen readonly list without changing its elements', () => {
    const amounts = Object.freeze([100n, 200n, 300n]);
    expect(sumGameMoney(amounts)).toBe(600n);
    expect(amounts).toEqual([100n, 200n, 300n]);
  });

  it.each([
    [[GAME_MONEY_MAX_MINOR, 1n, -1n], 'NEGATIVE'],
    [[GAME_MONEY_MAX_MINOR, 1n], 'TOO_LARGE'],
  ] as const)('preserves a mutable list %s when summation fails with %s', (input, code) => {
    const amounts = [...input];
    const original = [...amounts];

    expect(() => sumGameMoney(amounts)).toThrow(new GameMoneyError(code));
    expect(amounts).toEqual(original);
  });

  it('parses, sums, and formats 0.10 plus 0.20 exactly as 0.30', () => {
    expect(formatGameMoney(sumGameMoney([parseGameMoney('0.10'), parseGameMoney('0.20')]))).toBe(
      '0.30',
    );
  });
});

describe('subtractGameMoney', () => {
  it.each([
    [3n, 2n, 1n],
    [2n, 2n, 0n],
    [0n, 0n, 0n],
    [GAME_MONEY_MAX_MINOR, 0n, GAME_MONEY_MAX_MINOR],
    [GAME_MONEY_MAX_MINOR, GAME_MONEY_MAX_MINOR, 0n],
    [GAME_MONEY_MAX_MINOR, 1n, GAME_MONEY_MAX_MINOR - 1n],
    [9007199254740993n, 9007199254740992n, 1n],
  ] as const)('subtracts %s minus %s exactly to %s minor units', (a, b, expected) => {
    expect(subtractGameMoney(a, b)).toBe(expected);
  });

  it.each([
    [2n, 3n],
    [0n, 1n],
    [0n, GAME_MONEY_MAX_MINOR],
  ] as const)('rejects subtracting %s minus %s with INSUFFICIENT', (a, b) => {
    expectMoneyError(() => subtractGameMoney(a, b), 'INSUFFICIENT');
  });
});

describe('multiplyGameMoney', () => {
  it('exposes bigint-only amount, factor, and result types through the package root', () => {
    expectTypeOf(multiplyGameMoney).parameters.toEqualTypeOf<[bigint, bigint]>();
    expectTypeOf(multiplyGameMoney).returns.toEqualTypeOf<bigint>();
  });

  const thresholdFactors = [
    7n,
    10n,
    97n,
    9007199254740991n,
    9007199254740992n,
    9007199254740993n,
    GAME_MONEY_MAX_MINOR - 1n,
  ];

  it('preserves exact products at the last valid amount for varied bigint factors', () => {
    for (const factor of thresholdFactors) {
      const amount = GAME_MONEY_MAX_MINOR / factor;
      const expected = GAME_MONEY_MAX_MINOR - (GAME_MONEY_MAX_MINOR % factor);
      expect(multiplyGameMoney(amount, factor)).toBe(expected);
    }
  });

  it('rejects the first overflowing amount for varied bigint factors', () => {
    for (const factor of thresholdFactors) {
      const amount = GAME_MONEY_MAX_MINOR / factor + 1n;
      expectMoneyError(() => multiplyGameMoney(amount, factor), 'TOO_LARGE');
    }
  });

  it.each([
    [250n, 3n, 750n],
    [0n, 7n, 0n],
    [0n, 0n, 0n],
    [GAME_MONEY_MAX_MINOR, 0n, 0n],
    [GAME_MONEY_MAX_MINOR, 1n, GAME_MONEY_MAX_MINOR],
    [1n, GAME_MONEY_MAX_MINOR, GAME_MONEY_MAX_MINOR],
    [0n, GAME_MONEY_MAX_MINOR + 1n, 0n],
    [0n, 10n ** 100n, 0n],
    [GAME_MONEY_MAX_MINOR / 2n, 2n, GAME_MONEY_MAX_MINOR - 1n],
    [GAME_MONEY_MAX_MINOR / 3n, 3n, GAME_MONEY_MAX_MINOR],
    [9007199254740993n, 3n, 27021597764222979n],
  ] as const)('multiplies %s by %s exactly to %s minor units', (amount, factor, expected) => {
    expect(multiplyGameMoney(amount, factor)).toBe(expected);
  });

  it.each([
    [GAME_MONEY_MAX_MINOR, 2n],
    [GAME_MONEY_MAX_MINOR / 2n + 1n, 2n],
    [1n, GAME_MONEY_MAX_MINOR + 1n],
    [1n, 10n ** 100n],
  ] as const)('rejects the overflowing product of %s and %s with TOO_LARGE', (amount, factor) => {
    expectMoneyError(() => multiplyGameMoney(amount, factor), 'TOO_LARGE');
  });

  it.each([
    [-1n, 2n],
    [-1n, 0n],
    [-1n, -1n],
    [1n, -1n],
    [0n, -1n],
    [GAME_MONEY_MAX_MINOR, -1n],
  ] as const)('rejects operands (%s, %s) with NEGATIVE before multiplication', (amount, factor) => {
    expectMoneyError(() => multiplyGameMoney(amount, factor), 'NEGATIVE');
  });

  it.each([
    [GAME_MONEY_MAX_MINOR + 1n, 0n],
    [GAME_MONEY_MAX_MINOR + 1n, 1n],
    [GAME_MONEY_MAX_MINOR + 1n, -1n],
    [10n ** 100n, 0n],
  ] as const)('rejects invalid amount %s before checking factor %s', (amount, factor) => {
    expectMoneyError(() => multiplyGameMoney(amount, factor), 'TOO_LARGE');
  });

  it('parses, multiplies, and formats 0.25 times four exactly as 1.00', () => {
    expect(formatGameMoney(multiplyGameMoney(parseGameMoney('0.25'), 4n))).toBe('1.00');
  });
});

describe('checked arithmetic pair boundaries', () => {
  const amounts = [
    1n,
    99n,
    100n,
    9007199254740991n,
    9007199254740992n,
    9007199254740993n,
    GAME_MONEY_MAX_MINOR / 2n,
    GAME_MONEY_MAX_MINOR / 2n + 1n,
    GAME_MONEY_MAX_MINOR - 1n,
  ];

  it('preserves both operands through exact addition and subtraction across boundary pairs', () => {
    for (const a of amounts) {
      for (const b of amounts) {
        const expectedSum = a + b;
        if (expectedSum <= GAME_MONEY_MAX_MINOR) {
          const sum = addGameMoney(a, b);
          expect(sum).toBe(expectedSum);
          expect(subtractGameMoney(sum, b)).toBe(a);
          expect(subtractGameMoney(sum, a)).toBe(b);
        }
      }
    }
  });

  it('rejects overflow when neither operand alone reaches the maximum', () => {
    for (const a of amounts) {
      for (const b of amounts) {
        if (a + b > GAME_MONEY_MAX_MINOR) {
          expectMoneyError(() => addGameMoney(a, b), 'TOO_LARGE');
        }
      }
    }
  });
});

describe.each([
  ['addGameMoney', addGameMoney],
  ['subtractGameMoney', subtractGameMoney],
] as const)('%s operand validation', (_name, operation) => {
  it.each([
    [-1n, 0n],
    [0n, -1n],
    [-1n, 1n],
    [1n, -1n],
    [-GAME_MONEY_MAX_MINOR, GAME_MONEY_MAX_MINOR],
    [GAME_MONEY_MAX_MINOR, -GAME_MONEY_MAX_MINOR],
  ] as const)('rejects operands (%s, %s) with NEGATIVE before arithmetic', (a, b) => {
    expectMoneyError(() => operation(a, b), 'NEGATIVE');
  });

  it.each([
    [GAME_MONEY_MAX_MINOR + 1n, 0n],
    [0n, GAME_MONEY_MAX_MINOR + 1n],
    [GAME_MONEY_MAX_MINOR + 1n, GAME_MONEY_MAX_MINOR],
    [GAME_MONEY_MAX_MINOR, GAME_MONEY_MAX_MINOR + 1n],
    [10n ** 100n, 1n],
    [1n, 10n ** 100n],
  ] as const)('rejects operands (%s, %s) with TOO_LARGE before arithmetic', (a, b) => {
    expectMoneyError(() => operation(a, b), 'TOO_LARGE');
  });
});

describe('formatGameMoney', () => {
  it.each([
    [0n, '0.00'],
    [5n, '0.05'],
    [99n, '0.99'],
    [100n, '1.00'],
    [700n, '7.00'],
    [1234n, '12.34'],
    [90071992547409993n, '900719925474099.93'],
    [GAME_MONEY_MAX_MINOR, '999999999999999.99'],
  ] as const)('formats %s minor units canonically as %s', (input, expected) => {
    expect(formatGameMoney(input)).toBe(expected);
  });

  it('exports the exact maximum', () => {
    expect(GAME_MONEY_MAX_MINOR).toBe(99999999999999999n);
  });

  it.each([-1n, -GAME_MONEY_MAX_MINOR])('rejects %s with NEGATIVE', (input) => {
    expectMoneyError(() => formatGameMoney(input), 'NEGATIVE');
  });

  it.each([GAME_MONEY_MAX_MINOR + 1n, 10n ** 100n])('rejects %s with TOO_LARGE', (input) => {
    expectMoneyError(() => formatGameMoney(input), 'TOO_LARGE');
  });

  it.each(['0.00', '0.05', '1.00', '12.34', '900719925474099.93', '999999999999999.99'])(
    'round-trips canonical decimal %s',
    (input) => {
      expect(formatGameMoney(parseGameMoney(input))).toBe(input);
    },
  );

  it('round-trips every fractional remainder at small and large magnitudes', () => {
    for (const base of [0n, 100n, 90071992547409900n, GAME_MONEY_MAX_MINOR - 99n]) {
      for (let fraction = 0n; fraction < 100n; fraction += 1n) {
        const amount = base + fraction;
        expect(parseGameMoney(formatGameMoney(amount))).toBe(amount);
      }
    }
  });
});
