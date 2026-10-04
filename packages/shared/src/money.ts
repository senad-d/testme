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

/** Subtract minor units exactly, rejecting invalid operands and insufficient funds. */
export function subtractGameMoney(a: bigint, b: bigint): bigint {
  validateGameMoney(a);
  validateGameMoney(b);

  if (b > a) {
    throw new GameMoneyError('INSUFFICIENT');
  }
  return a - b;
}

/** Format minor units canonically; this does not format the API's integer transport. */
export function formatGameMoney(minorUnits: bigint): string {
  validateGameMoney(minorUnits);

  const integer = minorUnits / 100n;
  const fraction = (minorUnits % 100n).toString().padStart(2, '0');
  return `${integer}.${fraction}`;
}
