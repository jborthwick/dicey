/**
 * Seeded, serializable PRNG (mulberry32).
 *
 * The whole point: given the same seed and the same sequence of calls, we get
 * the same numbers. The generator's entire state is a single 32-bit integer, so
 * it can live inside `GameState` and travel with snapshots — no hidden globals,
 * no `Math.random`. That keeps every core function pure and every run
 * reproducible for regression tests.
 *
 * Convention: functions take the current rng state and return `[value, nextRng]`.
 * Callers must thread `nextRng` back into the game state; never reuse the old one.
 */

export type Rng = number;

/** Derive an initial rng state from an arbitrary seed (int or string). */
export function seedRng(seed: number | string): Rng {
  if (typeof seed === "number") {
    return seed >>> 0;
  }
  // Hash a string seed (xfnv1a) into a 32-bit state.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Advance the generator once, returning a float in [0, 1) and the next state. */
export function nextFloat(rng: Rng): [number, Rng] {
  let t = (rng + 0x6d2b79f5) >>> 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return [value, t];
}

/** Integer in [min, max] inclusive. */
export function nextInt(rng: Rng, min: number, max: number): [number, Rng] {
  if (max < min) [min, max] = [max, min];
  const [f, next] = nextFloat(rng);
  const value = min + Math.floor(f * (max - min + 1));
  return [value, next];
}

/** Pick a random element; returns the element and the next state. */
export function pick<T>(rng: Rng, arr: readonly T[]): [T, Rng] {
  if (arr.length === 0) throw new Error("pick() on empty array");
  const [i, next] = nextInt(rng, 0, arr.length - 1);
  return [arr[i]!, next];
}
