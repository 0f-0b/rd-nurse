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
