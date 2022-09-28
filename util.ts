export function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) * 4096 <= Math.abs(a) + Math.abs(b);
}

export function cleanUp(arr: number[]): undefined {
  const length = arr.length;
  if (length === 0) {
    return;
  }
  arr.sort((a, b) => a - b);
  let count = 1;
  for (let i = 1; i < length; i++) {
    if (!almostEqual(arr[count - 1], arr[i])) {
      arr[count++] = arr[i];
    }
  }
  arr.length = count;
}
