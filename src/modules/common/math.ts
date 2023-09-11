/**
 * @param number xxx
 * @returns 0.xxx
 */
export function toDecimal(raw: number): number {
  const len = raw.toString().length - 1
  return raw / Math.pow(10, len)
}
