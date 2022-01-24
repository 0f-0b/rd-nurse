export function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) * 4096 <= Math.abs(a) + Math.abs(b);
}

export function sortTime(arr: number[]): number[] {
  return arr.sort((a, b) => a - b)[unique](almostEqual);
}

export function lengthOf(arr: ArrayLike<unknown>): number {
  const len = Math.trunc(arr.length);
  return len > 0 ? Math.min(len, Number.MAX_SAFE_INTEGER) : 0;
}

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

export const unique = Symbol("unique");
export const emplace = Symbol("emplace");

declare global {
  interface Array<T> {
    [unique](equal?: (a: T, b: T) => unknown): this;
  }

  interface Map<K, V> {
    [emplace](
      key: K,
      handler: {
        insert?(key: K, map: Map<K, V>): V;
        update?(value: V, key: K, map: Map<K, V>): V;
      },
    ): V;
  }
}

Object.defineProperty(Array.prototype, unique, {
  value: function unique<T>(
    this: T[],
    equal: (a: T, b: T) => unknown = (a, b) => a === b,
  ): T[] {
    const length = lengthOf(this);
    if (length > 0) {
      let count = 1;
      for (let i = 1; i < length; i++) {
        if (!equal(this[count - 1], this[i])) {
          this[count++] = this[i];
        }
      }
      this.length = count;
    }
    return this;
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Map.prototype, emplace, {
  value: function emplace<K, V>(
    this: Map<K, V>,
    key: K,
    handler: {
      insert?(key: K, map: Map<K, V>): V;
      update?(value: V, key: K, map: Map<K, V>): V;
    },
  ): V {
    let value: V;
    if (Map.prototype.has.call(this, key)) {
      value = this.get(key)!;
      if ("update" in handler) {
        this.set(key, value = handler.update!(value, key, this));
      }
    } else {
      this.set(key, value = handler.insert!(key, this));
    }
    return value;
  },
  writable: true,
  configurable: true,
});
