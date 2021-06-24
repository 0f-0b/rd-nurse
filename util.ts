export function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) * 4096 < Math.abs(a) + Math.abs(b);
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

export function* repeat<T, U>(arr: readonly T[], mapper: (value: T, group: number) => U): Generator<U, never, unknown> {
  for (let i = 0; ; i++)
    for (const elem of arr)
      yield mapper(elem, i);
}
