import { describe, expect, it } from 'vitest';

import { formatGameMoney, GAME_MONEY_MAX_MINOR, GameMoneyError, parseGameMoney } from './index.js';

function expectMoneyError(action: () => unknown, code: GameMoneyError['code']): void {
  expect(action).toThrow(GameMoneyError);
  expect(action).toThrow(expect.objectContaining({ code }));
}

describe('GameMoneyError diagnostics', () => {
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
