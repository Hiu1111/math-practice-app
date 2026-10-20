/** A function returning a number in [0, 1), like Math.random. Injected so tests can be deterministic. */
export type RandomFn = () => number;

/** A random integer between min and max, inclusive. */
export function randomInt(min: number, max: number, rng: RandomFn = Math.random): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError(`randomInt bounds must be integers (got ${min}, ${max})`);
  }
  if (min > max) {
    throw new RangeError(`randomInt: min (${min}) is greater than max (${max})`);
  }
  const value = Math.floor(rng() * (max - min + 1)) + min;
  // Guard against an rng that returns exactly 1.
  return Math.min(value, max);
}

/** A random element of a non-empty array. */
export function randomChoice<T>(items: readonly T[], rng: RandomFn = Math.random): T {
  if (items.length === 0) throw new RangeError('randomChoice: array is empty');
  return items[randomInt(0, items.length - 1, rng)];
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
