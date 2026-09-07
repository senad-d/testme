// Export generated API contracts and explicitly reviewed safe primitives from this seam only.
export type * from './generated/api.js';

const APPLICATION_VERSION = '0.0.0';

export function getApplicationVersion(): string {
  return APPLICATION_VERSION;
}
