import { describe, expect, it } from 'vitest';

import { getApplicationVersion } from './index.js';

describe('getApplicationVersion', () => {
  it('returns a non-empty string', () => {
    const version = getApplicationVersion();

    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('returns the current application version', () => {
    expect(getApplicationVersion()).toBe('0.0.0');
  });

  it('returns the same version on repeated reads', () => {
    expect(getApplicationVersion()).toBe(getApplicationVersion());
  });
});
