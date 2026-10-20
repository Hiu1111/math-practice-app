import { makeAttempt, makeSession } from '../test/fixtures';
import { emptyAppStatistics } from '../types';
import { summaryMessage } from '../utils/feedback';
import { isCompletedSession } from '../utils/validation';
import {
  applyAttempt,
  calculateAccuracy,
  computeStatistics,
  recentSessions,
} from './statisticsService';

describe('calculateAccuracy', () => {
  it('is correct / attempted × 100, rounded', () => {
    expect(calculateAccuracy(3, 5)).toBe(60);
    expect(calculateAccuracy(2, 3)).toBe(67);
    expect(calculateAccuracy(10, 10)).toBe(100);
    expect(calculateAccuracy(0, 4)).toBe(0);
  });

  it('returns 0 instead of dividing by zero', () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });
});

describe('applyAttempt', () => {
  it('updates the overall, operation and difficulty totals', () => {
    let stats = emptyAppStatistics();
    stats = applyAttempt(stats, makeAttempt({ operation: 'subtraction', difficulty: 2 }));
    stats = applyAttempt(
      stats,
      makeAttempt({ operation: 'subtraction', difficulty: 4, selfReportedCorrect: false }),
    );
    stats = applyAttempt(stats, makeAttempt({ operation: 'division', difficulty: 4 }));

    expect(stats).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 });
    expect(stats.byOperation.subtraction).toEqual({ attempted: 2, correct: 1, incorrect: 1 });
    expect(stats.byOperation.division).toEqual({ attempted: 1, correct: 1, incorrect: 0 });
    expect(stats.byOperation.addition).toEqual({ attempted: 0, correct: 0, incorrect: 0 });
    expect(stats.byDifficulty[2]).toEqual({ attempted: 1, correct: 1, incorrect: 0 });
    expect(stats.byDifficulty[4]).toEqual({ attempted: 2, correct: 1, incorrect: 1 });
    expect(stats.byDifficulty[1].attempted).toBe(0);
  });

  it('does not change the statistics it was given', () => {
    const before = emptyAppStatistics();
    applyAttempt(before, makeAttempt());
    expect(before).toEqual(emptyAppStatistics());
  });

  it('keeps every breakdown adding up to the overall totals', () => {
    const ops = ['addition', 'subtraction', 'multiplication', 'division'] as const;
    const attempts = Array.from({ length: 200 }, (_, i) =>
      makeAttempt({
        operation: ops[i % 4],
        difficulty: ((i % 3) + 1) as 1 | 2 | 3,
        selfReportedCorrect: i % 5 !== 0,
      }),
    );
    const stats = computeStatistics(attempts);
    const sum = (rows: { attempted: number }[]) => rows.reduce((t, r) => t + r.attempted, 0);
    expect(stats.attempted).toBe(200);
    expect(stats.incorrect).toBe(40);
    expect(sum(Object.values(stats.byOperation))).toBe(200);
    expect(sum(Object.values(stats.byDifficulty))).toBe(200);
  });
});

describe('recentSessions', () => {
  it('lists sessions newest first and skips sessions with no answers', () => {
    const older = makeSession({ completedAt: '2026-10-18T10:00:00.000Z' });
    const newest = makeSession({ completedAt: '2026-10-20T10:00:00.000Z' });
    const unfinished = makeSession({
      startedAt: '2026-10-19T10:00:00.000Z',
      completedAt: undefined,
    });
    const empty = makeSession({ attempted: 0, correct: 0, incorrect: 0 });
    expect(recentSessions([older, empty, newest, unfinished]).map((s) => s.id)).toEqual([
      newest.id,
      unfinished.id,
      older.id,
    ]);
  });

  it('limits the list', () => {
    const many = Array.from({ length: 30 }, () => makeSession());
    expect(recentSessions(many, 10)).toHaveLength(10);
  });
});

describe('summaryMessage', () => {
  it('always encourages, whatever the score', () => {
    expect(summaryMessage(100).text).toMatch(/perfect/i);
    expect(summaryMessage(85).text).toMatch(/great job/i);
    expect(summaryMessage(50).text).toMatch(/nice work/i);
    expect(summaryMessage(0).text).toMatch(/keep practicing/i);
  });
});

describe('isCompletedSession', () => {
  const session = makeSession();

  it('accepts a finished session', () => {
    expect(isCompletedSession(session)).toBe(true);
  });

  it.each([
    ['unfinished', { ...session, completedAt: undefined }],
    ['totals that do not add up', { ...session, correct: 4 }],
    ['negative counts', { ...session, incorrect: -1, correct: 6 }],
    ['bad operations', { ...session, operations: [] }],
  ])('rejects %s', (_label, value) => {
    expect(isCompletedSession(value)).toBe(false);
  });
});
