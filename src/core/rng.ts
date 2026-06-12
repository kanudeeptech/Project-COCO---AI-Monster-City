/**
 * Deterministic seeded RNG (mulberry32). The shared-city architecture requires
 * every client to compute identical results — never use Math.random() in sim
 * or generator code.
 */
export type Rng = {
  /** integer in [0, n) */
  int(n: number): number;
  /** integer in [min, max] inclusive */
  range(min: number, max: number): number;
  /** true with probability pct/100 (integer percent — keeps sim math integral) */
  chance(pct: number): boolean;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: T[]): T[];
  /** raw 32-bit unsigned step (for hashing/debug) */
  next(): number;
};

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const int = (n: number): number => (n <= 0 ? 0 : next() % n);
  return {
    next,
    int,
    range: (min, max) => min + int(max - min + 1),
    chance: (pct) => int(100) < pct,
    pick: (arr) => arr[int(arr.length)],
    shuffle: (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

/** FNV-1a over a byte/number stream — used to hash city plans for determinism tests. */
export function fnv1a(values: Iterable<number>): number {
  let h = 0x811c9dc5;
  for (const v of values) {
    h ^= v & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 8) & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
