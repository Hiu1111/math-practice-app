import { seededRng } from '../test/seededRng';
import { DIFFICULTY_LEVELS, MATH_OPERATIONS, type MathOperation } from '../types';
import {
  differenceWithoutBorrowing,
  fallbackChoices,
  generateChoices,
  generateDistractors,
  isPlausible,
  mistakeCandidates,
  sumWithoutCarrying,
} from './distractors';
import { generateQuestion } from './questionGenerator';

function expectGoodDistractors(answer: number, distractors: number[], allowNegative = false) {
  expect(distractors).toHaveLength(3);
  expect(new Set(distractors).size).toBe(3);
  expect(distractors).not.toContain(answer);
  for (const d of distractors) {
    expect(Number.isInteger(d)).toBe(true);
    if (!allowNegative) expect(d).toBeGreaterThanOrEqual(0);
  }
}

describe('generateDistractors', () => {
  it.each(MATH_OPERATIONS)('gives three unique, whole, non-negative wrong answers for %s', (op) => {
    const rng = seededRng(op.length);
    for (const level of DIFFICULTY_LEVELS) {
      for (let i = 0; i < 300; i++) {
        const q = generateQuestion(op, level, { rng });
        const wrong = q.choices.filter((c) => c !== q.correctAnswer);
        expectGoodDistractors(q.correctAnswer, wrong);
      }
    }
  });

  it.each<[MathOperation, number, number, number]>([
    ['addition', 0, 0, 0],
    ['subtraction', 5, 5, 0],
    ['subtraction', 1, 0, 1],
    ['multiplication', 0, 0, 0],
    ['multiplication', 0, 4, 0],
    ['multiplication', 1, 1, 1],
    ['division', 1, 1, 1],
    ['division', 2, 2, 1],
  ])('handles answers near zero: %s %i, %i = %i', (op, a, b, answer) => {
    for (let seed = 0; seed < 50; seed++) {
      expectGoodDistractors(
        answer,
        generateDistractors(op, a, b, answer, { rng: seededRng(seed) }),
      );
    }
  });

  it('allows negative distractors only when negatives are allowed', () => {
    const rng = seededRng(1);
    const withNegatives = new Set<number>();
    for (let i = 0; i < 100; i++) {
      for (const d of generateDistractors('subtraction', 3, 5, -2, { allowNegative: true, rng })) {
        withNegatives.add(d);
      }
    }
    expect([...withNegatives].some((d) => d < 0)).toBe(true);
  });

  it('keeps distractors plausible (close to the answer)', () => {
    const rng = seededRng(2);
    for (const op of MATH_OPERATIONS) {
      for (let i = 0; i < 300; i++) {
        const q = generateQuestion(op, 4, { rng });
        for (const c of q.choices) expect(isPlausible(c, q.correctAnswer)).toBe(true);
      }
    }
  });
});

describe('operation-specific mistakes', () => {
  it('uses neighbouring times-table facts for multiplication (7 × 8)', () => {
    expect(mistakeCandidates('multiplication', 7, 8, 56)).toEqual(
      expect.arrayContaining([49, 63, 48, 64]),
    );
  });

  it('includes the divisor as a fact-family distractor for division (56 ÷ 7)', () => {
    expect(mistakeCandidates('division', 56, 7, 8)).toContain(7);
  });

  it('models forgetting to carry in addition', () => {
    expect(sumWithoutCarrying(27, 15)).toBe(32);
    expect(sumWithoutCarrying(48, 7)).toBe(45);
    expect(sumWithoutCarrying(21, 13)).toBe(34); // no carrying needed: same as the answer
    expect(mistakeCandidates('addition', 27, 15, 42)).toContain(32);
  });

  it('models forgetting to borrow in subtraction', () => {
    expect(differenceWithoutBorrowing(52, 17)).toBe(45);
    expect(differenceWithoutBorrowing(300, 125)).toBe(225);
    expect(mistakeCandidates('subtraction', 52, 17, 35)).toContain(45);
  });

  it('actually uses mistake distractors, not only nearby numbers', () => {
    const rng = seededRng(3);
    let usedTableNeighbour = false;
    for (let i = 0; i < 50 && !usedTableNeighbour; i++) {
      const choices = generateChoices('multiplication', 7, 8, 56, { rng });
      usedTableNeighbour = choices.some((c) => [48, 49, 63, 64].includes(c));
    }
    expect(usedTableNeighbour).toBe(true);
  });
});

describe('generateChoices', () => {
  it('contains the correct answer exactly once among four choices', () => {
    const rng = seededRng(4);
    for (let i = 0; i < 500; i++) {
      const choices = generateChoices('addition', 6, 7, 13, { rng });
      expect(choices).toHaveLength(4);
      expect(choices.filter((c) => c === 13)).toHaveLength(1);
    }
  });

  it('does not keep the correct answer in a predictable position', () => {
    const rng = seededRng(5);
    const positions = [0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) {
      positions[generateChoices('multiplication', 7, 8, 56, { rng }).indexOf(56)]++;
    }
    for (const count of positions) {
      expect(count).toBeGreaterThan(400); // about 500 expected in each slot
      expect(count).toBeLessThan(600);
    }
  });

  it('fallback choices are always valid', () => {
    const choices = fallbackChoices(0);
    expect([...choices].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });
});
