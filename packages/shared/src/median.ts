/**
 * Returns the central value, or the mean of the two central values, in numeric order.
 * Sorts a copy to preserve the caller's array. Throws RangeError for empty input.
 * Uses ordinary JavaScript-number arithmetic.
 */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const lower = sorted[Math.floor((sorted.length - 1) / 2)];
  const upper = sorted[Math.floor(sorted.length / 2)];

  if (lower === undefined || upper === undefined) {
    throw new RangeError('values must not be empty.');
  }

  return sorted.length % 2 === 1 ? upper : (lower + upper) / 2;
}
