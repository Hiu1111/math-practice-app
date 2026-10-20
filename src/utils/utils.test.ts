import { seededRng } from '../test/seededRng';
import { createId } from './ids';
import { clamp, randomChoice, randomInt } from './math';
import { shuffle } from './shuffle';

describe('randomInt', () => {
  it('returns the minimum and maximum at the edges of the random range', () => {
    expect(randomInt(3, 9, () => 0)).toBe(3);
    expect(randomInt(3, 9, () => 0.999999)).toBe(9);
    expect(randomInt(3, 9, () => 1)).toBe(9);
  });

  it('only returns whole numbers within the range, and reaches every value', () => {
    const rng = seededRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = randomInt(-2, 4, rng);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(-2);
      expect(n).toBeLessThanOrEqual(4);
      seen.add(n);
    }
    expect(seen.size).toBe(7);
  });

  it('handles a single-value range', () => {
    expect(randomInt(5, 5)).toBe(5);
  });

  it('rejects invalid bounds', () => {
    expect(() => randomInt(5, 1)).toThrow(RangeError);
    expect(() => randomInt(0.5, 2)).toThrow(TypeError);
  });
});

describe('randomChoice and clamp', () => {
  it('picks an element of the array', () => {
    const items = ['a', 'b', 'c'];
    expect(items).toContain(randomChoice(items));
    expect(randomChoice(items, () => 0)).toBe('a');
  });

  it('rejects an empty array', () => {
    expect(() => randomChoice([])).toThrow();
  });

  it('clamps values', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(4, 0, 10)).toBe(4);
  });
});

describe('shuffle', () => {
  it('keeps the same items and does not change the input', () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffle(input, seededRng(7));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...output].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('puts every item in every position over many shuffles', () => {
    const rng = seededRng(42);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      counts[shuffle(['x', 'b', 'c', 'd'], rng).indexOf('x')]++;
    }
    // A fair shuffle puts 'x' in each slot about 1000 times.
    for (const count of counts) {
      expect(count).toBeGreaterThan(850);
      expect(count).toBeLessThan(1150);
    }
  });

  it('handles empty and single-item arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([1])).toEqual([1]);
  });
});

describe('createId', () => {
  it('creates unique ids with the given prefix', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId('q')));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id.startsWith('q_')).toBe(true);
  });

  it('falls back when crypto.randomUUID is unavailable', () => {
    const original = globalThis.crypto.randomUUID;
    try {
      // @ts-expect-error simulate an insecure context without randomUUID
      globalThis.crypto.randomUUID = undefined;
      const a = createId('x');
      const b = createId('x');
      expect(a).not.toBe(b);
      expect(a.startsWith('x_')).toBe(true);
    } finally {
      globalThis.crypto.randomUUID = original;
    }
  });
});
