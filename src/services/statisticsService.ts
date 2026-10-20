import {
  MATH_OPERATIONS,
  emptyAppStatistics,
  type AppStatistics,
  type MathOperation,
  type MistakePattern,
  type MistakeStatistics,
  type OperationStatistics,
  type PracticeAttempt,
  type PracticeSession,
} from '../types';
import { isMastered } from './mistakeService';

/**
 * Accuracy as a whole-number percentage (spec 6.6):
 * correct answers / total questions attempted × 100.
 * Returns 0 when nothing has been attempted, instead of dividing by zero.
 */
export function calculateAccuracy(correct: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return Math.round((correct / attempted) * 100);
}

function addResult(totals: OperationStatistics, correct: boolean): OperationStatistics {
  return {
    attempted: totals.attempted + 1,
    correct: totals.correct + (correct ? 1 : 0),
    incorrect: totals.incorrect + (correct ? 0 : 1),
  };
}

/**
 * Statistics after one more attempt: overall, by operation, by difficulty
 * (spec 20.3), and review totals for mistake-review questions.
 */
export function applyAttempt(stats: AppStatistics, attempt: PracticeAttempt): AppStatistics {
  const correct = attempt.selfReportedCorrect;
  return {
    ...addResult(stats, correct),
    byOperation: {
      ...stats.byOperation,
      [attempt.operation]: addResult(stats.byOperation[attempt.operation], correct),
    },
    byDifficulty: {
      ...stats.byDifficulty,
      [attempt.difficulty]: addResult(stats.byDifficulty[attempt.difficulty], correct),
    },
    review: attempt.source === 'mistake-review' ? addResult(stats.review, correct) : stats.review,
  };
}

/** Rebuild statistics from a list of attempts (used to repair corrupted aggregates). */
export function computeStatistics(attempts: readonly PracticeAttempt[]): AppStatistics {
  return attempts.reduce(applyAttempt, emptyAppStatistics());
}

/** Review totals rebuilt from attempts (used by the schema v1 → v2 migration). */
export function computeReviewTotals(attempts: readonly PracticeAttempt[]): OperationStatistics {
  return computeStatistics(attempts.filter((a) => a.source === 'mistake-review')).review;
}

/** When a session was last active: its completion time, or its start time if unfinished. */
export function sessionActivityTime(session: PracticeSession): string {
  return session.completedAt ?? session.startedAt;
}

/** Sessions with at least one answer, newest first (spec 6.6, recent activity). */
export function recentSessions(
  sessions: readonly PracticeSession[],
  limit = 10,
): PracticeSession[] {
  return sessions
    .filter((s) => s.attempted > 0)
    .sort((a, b) => sessionActivityTime(b).localeCompare(sessionActivityTime(a)))
    .slice(0, limit);
}

/** Most incorrect answers first; ties go to the most recently missed (TODO task 64). */
export function sortByMostMissed(patterns: readonly MistakePattern[]): MistakePattern[] {
  return [...patterns].sort(
    (a, b) =>
      b.incorrectCount - a.incorrectCount || b.lastIncorrectAt.localeCompare(a.lastIncorrectAt),
  );
}

/** The operation(s) with the most misses across all mistakes; all of them when tied. */
export function mostMissedOperations(patterns: readonly MistakePattern[]): MathOperation[] {
  const totals = new Map<MathOperation, number>();
  for (const p of patterns)
    totals.set(p.operation, (totals.get(p.operation) ?? 0) + p.incorrectCount);
  const max = Math.max(0, ...totals.values());
  if (max === 0) return [];
  return MATH_OPERATIONS.filter((op) => totals.get(op) === max);
}

/** Everything the mistake section of the statistics page shows (spec 6.6). */
export function computeMistakeStatistics(
  patterns: readonly MistakePattern[],
  statistics: AppStatistics,
  masteryThreshold: number,
  factLimit = 5,
): MistakeStatistics {
  const mastered = patterns.filter((p) => isMastered(p, masteryThreshold)).length;
  return {
    activePatterns: patterns.length - mastered,
    masteredPatterns: mastered,
    similarQuestionsPracticed: statistics.review.attempted,
    similarQuestionsCorrect: statistics.review.correct,
    mostMissedOperations: mostMissedOperations(patterns),
    mostMissedFacts: sortByMostMissed(patterns).slice(0, factLimit),
  };
}
