import { toLength } from "./to_length.ts";

export function partitionPoint<T>(
  arr: ArrayLike<T>,
  pred: (value: T) => unknown,
): number {
  let l = 0;
  let r = toLength(arr.length);
  while (l < r) {
    const m = Math.floor((l + r) / 2);
    if (pred(arr[m])) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return l;
}
