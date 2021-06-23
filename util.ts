export function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) * 4096 < Math.abs(a) + Math.abs(b);
}

export function includes<T, U = T>(arr: readonly T[], value: U, equal: (a: T, b: U) => boolean): boolean {
  for (const elem of arr)
    if (equal(elem, value))
      return true;
  return false;
}

export function* repeat<T, U>(arr: readonly T[], mapper: (value: T, group: number) => U): Generator<U, never, unknown> {
  for (let i = 0; ; i++)
    for (const elem of arr)
      yield mapper(elem, i);
}
