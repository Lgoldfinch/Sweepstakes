// Small, dependency-free seeded PRNG helpers.
// Seeding the draw makes results reproducible and auditable: storing the seed
// lets anyone re-run the exact same shuffle to verify fairness.

/** Hash an arbitrary string into a 32-bit integer (used to seed the PRNG). */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Mulberry32: a tiny, fast, deterministic PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Return a new array shuffled with a seeded Fisher-Yates pass. */
export function seededShuffle<T>(input: T[], rng: () => number): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generate a short, URL-friendly random id (used for share slugs). */
export function shortId(length = 8): string {
  const alphabet = "23456789abcdefghijkmnpqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Create a fresh random seed string for a draw. */
export function newSeed(): string {
  return `${Date.now().toString(36)}-${shortId(10)}`;
}
