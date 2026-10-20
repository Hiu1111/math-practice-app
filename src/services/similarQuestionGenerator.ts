import type { DifficultyLevel, MathOperation, MistakePattern, Question } from '../types';
import { randomChoice, type RandomFn } from '../utils/math';
import { shuffle } from '../utils/shuffle';
import { operandsMatchDifficulty } from './difficultyRules';
import { pickReviewPattern, reviewablePatterns } from './mistakeService';
import { buildQuestion, isSameQuestion, questionProblems } from './questionGenerator';

/** The similarity rules from spec 6.4 (TODO tasks 54–56). */
export type SimilarityStrategy = 'nearby' | 'reversed' | 'fact-family';

export interface SimilarCandidate {
  strategy: SimilarityStrategy;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
}

type Fact = Pick<
  MistakePattern,
  'operation' | 'firstOperand' | 'secondOperand' | 'correctAnswer' | 'difficulty'
>;

const NEARBY_OFFSETS = [-2, -1, 1, 2];

/**
 * Same operation with nearby numbers (task 54): change one operand by 1 or 2.
 * Division changes the divisor or the quotient and rebuilds the dividend, so
 * the answer is always a whole number.
 */
export function nearbyCandidates({
  operation,
  firstOperand: a,
  secondOperand: b,
  correctAnswer: c,
}: Fact) {
  const out: SimilarCandidate[] = [];
  const add = (firstOperand: number, secondOperand: number) =>
    out.push({ strategy: 'nearby', operation, firstOperand, secondOperand });
  for (const d of NEARBY_OFFSETS) {
    if (operation === 'division') {
      add(b * (c + d), b); // nearby quotient, same divisor
      add((b + d) * c, b + d); // nearby divisor, same quotient
    } else {
      add(a + d, b);
      add(a, b + d);
    }
  }
  return out;
}

/**
 * Reversed operands (task 55). Only addition and multiplication: 7 − 3 and 3 − 7
 * (or 8 ÷ 2 and 2 ÷ 8) are different facts, so they are never treated as equivalent.
 */
export function reversedCandidates({ operation, firstOperand: a, secondOperand: b }: Fact) {
  if ((operation !== 'addition' && operation !== 'multiplication') || a === b) return [];
  return [{ strategy: 'reversed' as const, operation, firstOperand: b, secondOperand: a }];
}

/**
 * The related inverse operation from the same fact family (task 56):
 * 8 × 7 = 56 → 56 ÷ 7 and 56 ÷ 8; 56 ÷ 8 = 7 → 8 × 7 and 7 × 8;
 * 6 + 9 = 15 → 15 − 9 and 15 − 6; 15 − 9 = 6 → 9 + 6 and 6 + 9.
 */
export function factFamilyCandidates({
  operation,
  firstOperand: a,
  secondOperand: b,
  correctAnswer: c,
}: Fact): SimilarCandidate[] {
  const family = (op: MathOperation, x: number, y: number): SimilarCandidate => ({
    strategy: 'fact-family',
    operation: op,
    firstOperand: x,
    secondOperand: y,
  });
  switch (operation) {
    case 'addition':
      return [family('subtraction', c, b), family('subtraction', c, a)];
    case 'subtraction':
      return [family('addition', b, c), family('addition', c, b)];
    case 'multiplication':
      return [family('division', c, b), family('division', c, a)].filter(
        (f) => f.secondOperand !== 0,
      );
    case 'division':
      return [family('multiplication', b, c), family('multiplication', c, b)];
  }
}

/**
 * Every valid similar question for a mistake, by strategy. A candidate is kept
 * only if it fits the mistake's difficulty level (same numeric range, no
 * negative answers, whole-number division, no division by zero) and is not the
 * original question itself.
 */
export function listSimilarCandidates(pattern: Fact): SimilarCandidate[] {
  const seen = new Set<string>();
  return [
    ...nearbyCandidates(pattern),
    ...reversedCandidates(pattern),
    ...factFamilyCandidates(pattern),
  ].filter((c) => {
    const key = `${c.operation}:${c.firstOperand}:${c.secondOperand}`;
    if (seen.has(key) || isSameQuestion(c, pattern)) return false;
    seen.add(key);
    return operandsMatchDifficulty(
      c.operation,
      c.firstOperand,
      c.secondOperand,
      pattern.difficulty,
    );
  });
}

export interface SimilarQuestionOptions {
  rng?: RandomFn;
  /** The previous question, so the same one is not shown twice in a row. */
  avoid?: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'> | null;
}

/**
 * A question related to a mistake (spec 20.2), labelled 'mistake-review' and
 * linked to the pattern. A strategy is picked at random first (so reversed and
 * fact-family questions appear as often as nearby ones), then a candidate.
 * The exact original question is used only if nothing else fits.
 */
export function generateSimilarQuestion(
  pattern: MistakePattern,
  { rng = Math.random, avoid = null }: SimilarQuestionOptions = {},
): Question {
  const candidates = listSimilarCandidates(pattern).filter(
    (c) => !avoid || !isSameQuestion(c, avoid),
  );
  const strategies = [...new Set(candidates.map((c) => c.strategy))];

  const build = (c: Pick<SimilarCandidate, 'operation' | 'firstOperand' | 'secondOperand'>) =>
    buildQuestion({
      operation: c.operation,
      firstOperand: c.firstOperand,
      secondOperand: c.secondOperand,
      difficulty: pattern.difficulty,
      source: 'mistake-review',
      mistakePatternId: pattern.id,
      rng,
    });

  if (strategies.length > 0) {
    const strategy = randomChoice(strategies, rng);
    const ordered = [
      ...shuffle(
        candidates.filter((c) => c.strategy === strategy),
        rng,
      ),
      ...shuffle(
        candidates.filter((c) => c.strategy !== strategy),
        rng,
      ),
    ];
    for (const candidate of ordered) {
      try {
        const question = build(candidate);
        if (questionProblems(question).length === 0) return question;
      } catch {
        // Try the next candidate.
      }
    }
  }
  return build(pattern);
}

/**
 * The next question in a mistake-review session (spec 20.2 and TODO task 60):
 * pick a mistake that matches the session's operations and level by review
 * priority (taking turns with other mistakes), then make a similar question
 * for it. Returns null when nothing is left to review (e.g. all mastered).
 */
export function nextReviewQuestion(
  patterns: readonly MistakePattern[],
  choices: { operations: readonly MathOperation[]; difficulty: DifficultyLevel },
  masteryThreshold: number,
  previous: Question | null,
  { rng = Math.random, now = new Date() }: { rng?: RandomFn; now?: Date } = {},
): Question | null {
  const pool = reviewablePatterns(patterns, choices, masteryThreshold);
  const pattern = pickReviewPattern(pool, {
    previousPatternId: previous?.mistakePatternId,
    masteryThreshold,
    now,
    rng,
  });
  return pattern ? generateSimilarQuestion(pattern, { rng, avoid: previous }) : null;
}
