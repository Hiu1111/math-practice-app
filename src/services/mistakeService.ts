import type { MistakePattern, PracticeAttempt } from '../types';
import { createId } from '../utils/ids';

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
 * - Correct regular answers do not change mistakes.
 */
export function updateMistakePatterns(
  patterns: MistakePattern[],
  attempt: PracticeAttempt,
): MistakePattern[] {
  if (attempt.source !== 'regular' || attempt.selfReportedCorrect) return patterns;

  const existing = patterns.find((p) => isSamePattern(p, attempt));
  if (existing) {
    return patterns.map((p) =>
      p.id === existing.id ? recordRepeatMistake(p, attempt.attemptedAt) : p,
    );
  }
  return limitPatterns([...patterns, createMistakePattern(attempt)]);
}
