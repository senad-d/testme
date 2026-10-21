export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError('Minimum must not exceed maximum.');
  }

  return Math.min(Math.max(value, min), max);
}
