export function toLength(value: number): number {
  const len = Math.trunc(value);
  return len > 0 ? Math.min(len, Number.MAX_SAFE_INTEGER) : 0;
}
