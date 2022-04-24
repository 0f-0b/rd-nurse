export function partitionPoint<T>(
  arr: readonly T[],
  pred: (value: T, index: number, arr: readonly T[]) => unknown,
): number {
  let l = 0;
  let r = arr.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (pred(arr[m], m, arr)) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return l;
}
