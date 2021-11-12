export function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) * 4096 <= Math.abs(a) + Math.abs(b);
}

export function sortTime(arr: number[]): number[] {
  return arr.sort((a, b) => a - b)[unique](almostEqual);
}

export const unique = Symbol("unique");

declare global {
  interface Array<T> {
    [unique](equal: (a: T, b: T) => unknown): this;
  }
}

Object.defineProperty(Array.prototype, unique, {
  value<T>(this: T[], equal: (a: T, b: T) => unknown): T[] {
    if (this.length > 0) {
      let count = 1;
      for (let i = 1, len = this.length; i < len; i++) {
        if (!equal(this[count - 1], this[i])) {
          this[count++] = this[i];
        }
      }
      this.length = count;
    }
    return this;
  },
});
