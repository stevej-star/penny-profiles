/** Seeded PRNG (mulberry32) so any generated value can be reproduced from its seed. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** String of `length` random decimal digits. */
  digits(length: number): string;
  /** Raw 32-bit integer, used to seed faker. */
  uint32(): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const uint32 = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const next = () => uint32() / 4294967296;
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    uint32,
    pick: (items) => {
      if (items.length === 0) throw new Error('Cannot pick from an empty list');
      return items[int(0, items.length - 1)];
    },
    digits: (length) => Array.from({ length }, () => String(int(0, 9))).join(''),
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
