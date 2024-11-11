export function partitionPoint<T>(
  arr: ArrayLike<T>,
  pred: (value: T) => unknown,
): number {
  let lower = 0;
  let upper = arr.length;
  while (lower < upper) {
    const mid = Math.floor((lower + upper) / 2);
    if (pred(arr[mid])) {
      lower = mid + 1;
    } else {
      upper = mid;
    }
  }
  return lower;
}
