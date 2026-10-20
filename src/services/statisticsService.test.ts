import { summaryMessage } from '../utils/feedback';
import { isCompletedSession } from '../utils/validation';
import { calculateAccuracy } from './statisticsService';

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

describe('summaryMessage', () => {
  it('always encourages, whatever the score', () => {
    expect(summaryMessage(100).text).toMatch(/perfect/i);
    expect(summaryMessage(85).text).toMatch(/great job/i);
    expect(summaryMessage(50).text).toMatch(/nice work/i);
    expect(summaryMessage(0).text).toMatch(/keep practicing/i);
  });
});

describe('isCompletedSession', () => {
  const session = {
    id: 's1',
    startedAt: '2026-10-20T10:00:00Z',
    completedAt: '2026-10-20T10:05:00Z',
    operations: ['addition'],
    difficulty: 1,
    sessionLength: 5,
    reviewMode: 'regular',
    attempted: 5,
    correct: 3,
    incorrect: 2,
    reviewQuestionsCompleted: 0,
  };

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
