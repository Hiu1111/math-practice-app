import {
  emptyAppStatistics,
  type AppStatistics,
  type OperationStatistics,
  type PracticeAttempt,
  type PracticeSession,
} from '../types';

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
