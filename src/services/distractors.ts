import { CHOICE_COUNT, type MathOperation } from '../types';
import type { RandomFn } from '../utils/math';
import { shuffle } from '../utils/shuffle';

export const DISTRACTOR_COUNT = CHOICE_COUNT - 1;

/** Upper bound on fallback steps, so distractor generation can never loop forever. */
export const MAX_DISTRACTOR_ATTEMPTS = 50;

/** At most this many distractors come from "common mistake" strategies; the rest are nearby numbers. */
const MAX_MISTAKE_DISTRACTORS = 2;

export interface DistractorOptions {
  allowNegative?: boolean;
  rng?: RandomFn;
}

/** Digits of n from the ones place upward: 427 → [7, 2, 4]. */
function digits(n: number): number[] {
  const result: number[] = [];
  let rest = Math.abs(n);
  do {
    result.push(rest % 10);
    rest = Math.floor(rest / 10);
  } while (rest > 0);
  return result;
}

/** Adding column by column but forgetting to carry: 27 + 15 → 32 (instead of 42). */
export function sumWithoutCarrying(a: number, b: number): number {
  const da = digits(a);
  const db = digits(b);
  let result = 0;
  for (let i = 0, place = 1; i < Math.max(da.length, db.length); i++, place *= 10) {
    result += (((da[i] ?? 0) + (db[i] ?? 0)) % 10) * place;
  }
  return result;
}

/** Subtracting the smaller digit from the larger in each column instead of borrowing: 52 − 17 → 45. */
export function differenceWithoutBorrowing(a: number, b: number): number {
  const da = digits(a);
  const db = digits(b);
  let result = 0;
  for (let i = 0, place = 1; i < Math.max(da.length, db.length); i++, place *= 10) {
    result += Math.abs((da[i] ?? 0) - (db[i] ?? 0)) * place;
  }
  return result;
}

/** Numbers right next to the answer. */
export function nearbyCandidates(answer: number): number[] {
  return [answer + 1, answer - 1, answer + 2, answer - 2, answer + 3, answer - 3];
}

/** Wrong answers a student might plausibly reach by making a typical mistake. */
export function mistakeCandidates(
  operation: MathOperation,
  a: number,
  b: number,
  answer: number,
): number[] {
  switch (operation) {
    case 'addition':
      // Forgot to carry; carried into the wrong column.
      return [sumWithoutCarrying(a, b), answer + 10, answer - 10];
    case 'subtraction':
      // Forgot to borrow; off by ten after borrowing.
      return [differenceWithoutBorrowing(a, b), answer + 10, answer - 10];
    case 'multiplication':
      // Neighbouring facts in the times table: 7 × 8 → 7 × 7, 7 × 9, 6 × 8, 8 × 8.
      return [a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b];
    case 'division': {
      // Fact-family confusion: for 56 ÷ 7 = 8, offer 7 (the divisor), plus the quotients
      // for neighbouring divisors when they divide evenly (e.g. 54 ÷ 6 → 54 ÷ 9 = 6).
      const result = [b];
      if (b + 1 > 0 && a % (b + 1) === 0) result.push(a / (b + 1));
      if (b - 1 > 0 && a % (b - 1) === 0) result.push(a / (b - 1));
      return result;
    }
  }
}

/** Close enough to the answer to be believable. */
export function isPlausible(candidate: number, answer: number): boolean {
  return Math.abs(candidate - answer) <= Math.max(10, Math.ceil(Math.abs(answer) * 0.5));
}

function isAcceptable(candidate: number, answer: number, allowNegative: boolean): boolean {
  return Number.isInteger(candidate) && candidate !== answer && (allowNegative || candidate >= 0);
}

/**
 * Three unique, plausible wrong answers for a question (spec section 8.2):
 * up to two from common-mistake strategies, the rest from nearby numbers,
 * with a bounded fallback that always succeeds for whole-number answers.
 */
export function generateDistractors(
  operation: MathOperation,
  a: number,
  b: number,
  answer: number,
  { allowNegative = false, rng = Math.random }: DistractorOptions = {},
): number[] {
  const chosen = new Set<number>();
  const tryAdd = (candidate: number, requirePlausible = true) => {
    if (chosen.size >= DISTRACTOR_COUNT || chosen.has(candidate)) return;
    if (!isAcceptable(candidate, answer, allowNegative)) return;
    if (requirePlausible && !isPlausible(candidate, answer)) return;
    chosen.add(candidate);
  };

  for (const candidate of shuffle(mistakeCandidates(operation, a, b, answer), rng)) {
    if (chosen.size >= MAX_MISTAKE_DISTRACTORS) break;
    tryAdd(candidate);
  }
  for (const candidate of shuffle(nearbyCandidates(answer), rng)) {
    tryAdd(candidate);
  }
  // Fallback: walk outward from the answer. Bounded so it can never loop forever.
  for (
    let offset = 1;
    chosen.size < DISTRACTOR_COUNT && offset <= MAX_DISTRACTOR_ATTEMPTS;
    offset++
  ) {
    tryAdd(answer + offset, false);
    tryAdd(answer - offset, false);
  }

  if (chosen.size < DISTRACTOR_COUNT) {
    throw new Error(`Could not generate ${DISTRACTOR_COUNT} distractors for answer ${answer}`);
  }
  return [...chosen];
}

/** The correct answer plus three distractors, in random order. */
export function generateChoices(
  operation: MathOperation,
  a: number,
  b: number,
  answer: number,
  options: DistractorOptions = {},
): number[] {
  const rng = options.rng ?? Math.random;
  return shuffle([answer, ...generateDistractors(operation, a, b, answer, options)], rng);
}

/** Simple, always-valid choices for a fallback question: the answer and the next three numbers. */
export function fallbackChoices(answer: number, rng: RandomFn = Math.random): number[] {
  return shuffle([answer, answer + 1, answer + 2, answer + 3], rng);
}
