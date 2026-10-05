// Standalone utility bound, not an approved durable Reward Balance ceiling (OQ-11).
export const GAME_MONEY_MAX_MINOR = 99999999999999999n;

type GameMoneyErrorCode = 'EMPTY' | 'FORMAT' | 'TOO_LARGE' | 'NEGATIVE' | 'INSUFFICIENT';

// Preserve the literal constructor code for consumers as the supported union grows.
export class GameMoneyError<Code extends GameMoneyErrorCode = GameMoneyErrorCode> extends Error {
  constructor(public readonly code: Code) {
    super(`Invalid Game Money amount (${code}).`);
    this.name = 'GameMoneyError';
  }
}

/** Parse the issue #85 decimal syntax into exact two-decimal minor units. */
export function parseGameMoney(input: string): bigint {
  if (input === '') {
    throw new GameMoneyError('EMPTY');
  }

  const match = /^[0-9]+(?:\.[0-9]{1,2})?$/u.exec(input);
  // JavaScript's $ also matches before a final line terminator; require the full input.
  if (match === null || match[0] !== input) {
    throw new GameMoneyError('FORMAT');
  }

  const [integer = '', fraction = ''] = input.split('.');
  if (integer.length > 15) {
    throw new GameMoneyError('TOO_LARGE');
  }

  return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function validateGameMoney(minorUnits: bigint): void {
  if (minorUnits < 0n) {
    throw new GameMoneyError('NEGATIVE');
  }
  if (minorUnits > GAME_MONEY_MAX_MINOR) {
    throw new GameMoneyError('TOO_LARGE');
  }
}

/** Add minor units exactly, rejecting invalid operands and an out-of-bounds sum. */
export function addGameMoney(a: bigint, b: bigint): bigint {
  validateGameMoney(a);
  validateGameMoney(b);

  const sum = a + b;
  if (sum > GAME_MONEY_MAX_MINOR) {
    throw new GameMoneyError('TOO_LARGE');
  }
  return sum;
}

/** Validate every amount before accumulating minor units with checked addition. */
export function sumGameMoney(amounts: readonly bigint[]): bigint {
  for (const amount of amounts) {
    validateGameMoney(amount);
  }

  let total = 0n;
  for (const amount of amounts) {
    total = addGameMoney(total, amount);
  }
  return total;
}

/** Subtract minor units exactly, rejecting invalid operands and insufficient funds. */
export function subtractGameMoney(a: bigint, b: bigint): bigint {
  validateGameMoney(a);
  validateGameMoney(b);

  if (b > a) {
    throw new GameMoneyError('INSUFFICIENT');
  }
  return a - b;
}

/** Scale valid minor units by a non-negative bigint factor within the utility bound. */
export function multiplyGameMoney(amount: bigint, factor: bigint): bigint {
  validateGameMoney(amount);
  if (factor < 0n) {
    throw new GameMoneyError('NEGATIVE');
  }

  const product = amount * factor;
  if (product > GAME_MONEY_MAX_MINOR) {
    throw new GameMoneyError('TOO_LARGE');
  }
  return product;
}

/** Format minor units canonically; this does not format the API's integer transport. */
export function formatGameMoney(minorUnits: bigint): string {
  validateGameMoney(minorUnits);

  const integer = minorUnits / 100n;
  const fraction = (minorUnits % 100n).toString().padStart(2, '0');
  return `${integer}.${fraction}`;
}
