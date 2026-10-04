// Export generated API contracts and explicitly reviewed safe primitives from this seam only.
export type * from './generated/api.js';
export { formatGameMoney, GAME_MONEY_MAX_MINOR, GameMoneyError, parseGameMoney } from './money.js';

const APPLICATION_DESCRIPTION = 'Mobey family learning and rewards';
const APPLICATION_NAME = 'mobey';
const APPLICATION_VERSION = '0.0.0';

export function getApplicationDescription(): string {
  return APPLICATION_DESCRIPTION;
}

export function getApplicationName(): string {
  return APPLICATION_NAME;
}

export function getApplicationVersion(): string {
  return APPLICATION_VERSION;
}
