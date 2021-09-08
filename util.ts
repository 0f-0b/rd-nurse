export function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) * 4096 <= Math.abs(a) + Math.abs(b);
}

export function formatTime([bar, beat]: [number, number]): string {
  return `${bar + 1}-${Math.round((beat + 1) * 1000) / 1000}`;
}

export function includes<T, U = T>(arr: readonly T[], value: U, equal: (a: T, b: U) => boolean): boolean {
  for (const elem of arr)
    if (equal(elem, value))
      return true;
  return false;
}

export function unique<T>(arr: T[], equal: (a: T, b: T) => boolean): T[] {
  if (arr.length > 0) {
    let result = 1;
    for (let i = 1, len = arr.length; i < len; i++)
      if (!equal(arr[result - 1], arr[i]))
        arr[result++] = arr[i];
    arr.length = result;
  }
  return arr;
}

export interface JoinToStringOptions {
  separator?: string;
  prefix?: string;
  suffix?: string;
}

export function joinToString<T>(it: Iterable<T>, selector: (value: T) => string, { separator = ", ", prefix = "", suffix = "" }: JoinToStringOptions = {}): string {
  const result = [prefix];
  let count = 0;
  for (const elem of it) {
    if (++count > 1)
      result.push(separator);
    result.push(selector(elem));
  }
  result.push(suffix);
  return result.join("");
}

export function partitionPoint<T>(arr: readonly T[], pred: (value: T, index: number, arr: readonly T[]) => boolean): number {
  let l = 0;
  let r = arr.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (pred(arr[m], m, arr))
      l = m + 1;
    else
      r = m;
  }
  return l;
}

export function* repeat<T, U>(arr: readonly T[], mapper: (value: T, group: number) => U): Generator<U, never, unknown> {
  for (let i = 0; ; i++)
    for (const elem of arr)
      yield mapper(elem, i);
}
