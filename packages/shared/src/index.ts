// Export generated API contracts and explicitly reviewed safe primitives from this seam only.
export type * from './generated/api.js';

const APPLICATION_NAME = 'mobey';
const APPLICATION_VERSION = '0.0.0';

export function getApplicationName(): string {
  return APPLICATION_NAME;
}

export function getApplicationVersion(): string {
  return APPLICATION_VERSION;
}
