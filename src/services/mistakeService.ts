import {
  DEFAULT_MASTERY_THRESHOLD,
  type DifficultyLevel,
  type MathOperation,
  type MistakePattern,
  type PracticeAttempt,
} from '../types';
import { createId } from '../utils/ids';
import { randomChoice, type RandomFn } from '../utils/math';

/** Keep the mistake list compact; mastered and oldest patterns are dropped first. */
export const MAX_STORED_MISTAKES = 500;

type Fact = Pick<MistakePattern, 'operation' | 'firstOperand' | 'secondOperand'>;

/** Two records describe the same mistake when the operation and both operands match. */
export function isSamePattern(a: Fact, b: Fact): boolean {
  return (
    a.operation === b.operation &&
    a.firstOperand === b.firstOperand &&
    a.secondOperand === b.secondOperand
  );
}

/** A new mistake pattern from an incorrect attempt (TODO task 51). */
export function createMistakePattern(attempt: PracticeAttempt): MistakePattern {
  return {
    id: createId('mistake'),
    operation: attempt.operation,
    firstOperand: attempt.firstOperand,
    secondOperand: attempt.secondOperand,
    correctAnswer: attempt.correctAnswer,
    difficulty: attempt.difficulty,
    incorrectCount: 1,
    similarCorrectCount: 0,
    firstIncorrectAt: attempt.attemptedAt,
    lastIncorrectAt: attempt.attemptedAt,
    mastered: false,
  };
}

/**
 * The same fact was missed again in regular practice (TODO task 52): count it,
 * update the time, and start mastery over, because the student still needs it.
 * A mastered pattern becomes active again (TODO task 62).
 */
export function recordRepeatMistake(pattern: MistakePattern, at: string): MistakePattern {
  return {
    ...pattern,
    incorrectCount: pattern.incorrectCount + 1,
    lastIncorrectAt: at,
    similarCorrectCount: 0,
    mastered: false,
  };
}

/** Drop the least useful patterns when the list is too long: mastered first, then oldest. */
export function limitPatterns(patterns: MistakePattern[]): MistakePattern[] {
  if (patterns.length <= MAX_STORED_MISTAKES) return patterns;
  const keep = [...patterns].sort((a, b) => {
    if (a.mastered !== b.mastered) return a.mastered ? 1 : -1;
    return b.lastIncorrectAt.localeCompare(a.lastIncorrectAt);
  });
  const kept = new Set(keep.slice(0, MAX_STORED_MISTAKES).map((p) => p.id));
  return patterns.filter((p) => kept.has(p.id));
}

/**
 * Update the mistake list after an attempt. Returns the same array when nothing
 * changed, so callers can skip saving.
 *
 * - A regular question marked wrong creates a pattern, or updates the existing
 *   one for the same fact (never a duplicate).
 * - A mistake-review question updates the pattern it came from (tasks 61–62):
 *   right → one step closer to mastery (mastered at the threshold);
 *   wrong → counted as another miss and one step further from mastery.
 * - Correct regular answers do not change mistakes.
 */
export function updateMistakePatterns(
  patterns: MistakePattern[],
  attempt: PracticeAttempt,
  masteryThreshold: number = DEFAULT_MASTERY_THRESHOLD,
): MistakePattern[] {
  if (attempt.source === 'mistake-review') {
    const target = patterns.find((p) => p.id === attempt.mistakePatternId);
    if (!target) return patterns;
    return patterns.map((p) =>
      p.id === target.id ? recordReviewResult(p, attempt, masteryThreshold) : p,
    );
  }

  if (attempt.selfReportedCorrect) return patterns;

  const existing = patterns.find((p) => isSamePattern(p, attempt));
  if (existing) {
    return patterns.map((p) =>
      p.id === existing.id ? recordRepeatMistake(p, attempt.attemptedAt) : p,
    );
  }
  return limitPatterns([...patterns, createMistakePattern(attempt)]);
}

/** Apply one review answer to the pattern it was generated from. */
export function recordReviewResult(
  pattern: MistakePattern,
  attempt: Pick<PracticeAttempt, 'selfReportedCorrect' | 'attemptedAt'>,
  masteryThreshold: number,
): MistakePattern {
  if (attempt.selfReportedCorrect) {
    const similarCorrectCount = pattern.similarCorrectCount + 1;
    return {
      ...pattern,
      similarCorrectCount,
      mastered: pattern.mastered || similarCorrectCount >= masteryThreshold,
    };
  }
  // A wrong review answer is gentler than a new mistake: progress goes back one step.
  return {
    ...pattern,
    incorrectCount: pattern.incorrectCount + 1,
    lastIncorrectAt: attempt.attemptedAt,
    similarCorrectCount: Math.max(0, pattern.similarCorrectCount - 1),
    mastered: false,
  };
}

// ------------------------------------------------------------------
// Mastery and review selection (TODO tasks 58–62)
// ------------------------------------------------------------------

/**
 * Mastered after enough correct similar answers (spec 6.4, default 3). Also true
 * if the threshold setting was lowered below the progress already made.
 */
export function isMastered(pattern: MistakePattern, masteryThreshold: number): boolean {
  return pattern.mastered || pattern.similarCorrectCount >= masteryThreshold;
}

export function activePatterns(patterns: readonly MistakePattern[], masteryThreshold: number) {
  return patterns.filter((p) => !isMastered(p, masteryThreshold));
}

/**
 * Active mistakes that match the setup choices: one of the selected operations
 * at the selected level, so review questions match the selected difficulty.
 */
export function reviewablePatterns(
  patterns: readonly MistakePattern[],
  choices: { operations: readonly MathOperation[]; difficulty: DifficultyLevel },
  masteryThreshold: number,
): MistakePattern[] {
  return activePatterns(patterns, masteryThreshold).filter(
    (p) => choices.operations.includes(p.operation) && p.difficulty === choices.difficulty,
  );
}

const HOUR = 60 * 60 * 1000;

/**
 * Review priority (spec 6.4): higher when a fact was missed many times, missed
 * recently, or has few correct similar answers so far; lower as correct
 * similar answers build up.
 */
export function priorityScore(
  pattern: MistakePattern,
  now: Date,
  masteryThreshold: number,
): number {
  const frequency = 2 * pattern.incorrectCount;
  const hoursAgo = (now.getTime() - new Date(pattern.lastIncorrectAt).getTime()) / HOUR;
  const recency = hoursAgo < 24 ? 3 : hoursAgo < 24 * 7 ? 2 : hoursAgo < 24 * 30 ? 1 : 0;
  const progress = Math.min(pattern.similarCorrectCount, masteryThreshold) / masteryThreshold;
  const needsReview = 3 * (1 - progress);
  return frequency + recency + needsReview;
}

/** Highest priority first; a small random jitter mixes patterns with similar scores. */
export function prioritizePatterns(
  patterns: readonly MistakePattern[],
  { now = new Date(), masteryThreshold = DEFAULT_MASTERY_THRESHOLD, rng = Math.random } = {},
): MistakePattern[] {
  return patterns
    .map((p) => ({ p, score: priorityScore(p, now, masteryThreshold) + rng() * 0.5 }))
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
}

/** How many top-priority mistakes take turns, so one session mixes several of them. */
const REVIEW_POOL_SIZE = 3;

/**
 * Choose the mistake for the next review question: one of the top few by
 * priority, not the same as last time when another is available.
 */
export function pickReviewPattern(
  patterns: readonly MistakePattern[],
  {
    previousPatternId,
    now = new Date(),
    masteryThreshold = DEFAULT_MASTERY_THRESHOLD,
    rng = Math.random,
  }: {
    previousPatternId?: string;
    now?: Date;
    masteryThreshold?: number;
    rng?: RandomFn;
  } = {},
): MistakePattern | null {
  const ranked = prioritizePatterns(activePatterns(patterns, masteryThreshold), {
    now,
    masteryThreshold,
    rng,
  });
  if (ranked.length === 0) return null;
  const fresh = ranked.filter((p) => p.id !== previousPatternId);
  const pool = (fresh.length > 0 ? fresh : ranked).slice(0, REVIEW_POOL_SIZE);
  return randomChoice(pool, rng);
}
