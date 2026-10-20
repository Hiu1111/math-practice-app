import { DEFAULT_SETTINGS, MATH_OPERATIONS, emptyAppStatistics } from './index';

describe('shared types and defaults', () => {
  it('creates empty statistics for every operation and difficulty', () => {
    const stats = emptyAppStatistics();
    expect(stats.attempted).toBe(0);
    for (const op of MATH_OPERATIONS) {
      expect(stats.byOperation[op]).toEqual({ attempted: 0, correct: 0, incorrect: 0 });
    }
    expect(Object.keys(stats.byDifficulty)).toEqual(['1', '2', '3', '4']);
  });

  it('returns independent objects so callers cannot share mutations', () => {
    const a = emptyAppStatistics();
    const b = emptyAppStatistics();
    a.byOperation.addition.attempted = 5;
    expect(b.byOperation.addition.attempted).toBe(0);
  });

  it('uses a mastery threshold of 3 by default', () => {
    expect(DEFAULT_SETTINGS.masteryThreshold).toBe(3);
  });
});
