export function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) * 4096 <= Math.abs(a) + Math.abs(b);
}

export function unique<T>(arr: T[], equal: (a: T, b: T) => boolean): T[] {
  if (arr.length > 0) {
    let count = 1;
    for (let i = 1, len = arr.length; i < len; i++) {
      if (!equal(arr[count - 1], arr[i])) {
        arr[count++] = arr[i];
      }
    }
    arr.length = count;
  }
  return arr;
}

export interface JoinToStringOptions {
  separator?: string;
  prefix?: string;
  suffix?: string;
  truncate?: {
    after: number;
    with?: string;
  };
}

export function joinToString<T>(
  it: Iterable<T>,
  selector: (value: T) => string,
  {
    separator = ", ",
    prefix = "",
    suffix = "",
    truncate: {
      after: limit,
      with: truncated = "...",
    } = { after: Infinity },
  }: JoinToStringOptions = {},
): string {
  let result = prefix;
  let count = 0;
  for (const elem of it) {
    if (++count > 1) {
      result += separator;
    }
    if (count > limit) {
      result += truncated;
      break;
    }
    result += selector(elem);
  }
  result += suffix;
  return result;
}

export function partitionPoint<T>(
  arr: readonly T[],
  pred: (value: T, index: number, arr: readonly T[]) => boolean,
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

export function* repeat<T, U>(
  arr: readonly T[],
  selector: (value: T, group: number) => U,
): Generator<U, never, unknown> {
  for (let i = 0;; i++) {
    for (const elem of arr) {
      yield selector(elem, i);
    }
  }
}
