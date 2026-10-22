/**
 * Caps text at max Unicode code points, including a single … when truncated.
 * Preserves unchanged text exactly; does not normalize or count grapheme clusters.
 * Zero returns ''; max must be a nonnegative safe integer or throws RangeError,
 * even for empty text.
 */
export function truncateText(text: string, max: number): string {
  if (!Number.isSafeInteger(max) || max < 0) {
    throw new RangeError('max must be a nonnegative safe integer.');
  }

  const codePoints = Array.from(text);
  if (codePoints.length <= max) {
    return text;
  }
  if (max === 0) {
    return '';
  }
  return `${codePoints.slice(0, max - 1).join('')}…`;
}
