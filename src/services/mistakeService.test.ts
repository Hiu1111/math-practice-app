import { makeAttempt } from '../test/fixtures';
import type { MistakePattern } from '../types';
import {
  MAX_STORED_MISTAKES,
  createMistakePattern,
  limitPatterns,
  updateMistakePatterns,
} from './mistakeService';

const wrong = (overrides = {}) =>
  makeAttempt({
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 7,
    correctAnswer: 56,
    selectedAnswer: 54,
    selfReportedCorrect: false,
    difficulty: 2,
    ...overrides,
  });

describe('creating mistake patterns (task 51)', () => {
  it('stores operation, operands, answer, difficulty, dates and counts (spec 6.4)', () => {
    const attempt = wrong({ attemptedAt: '2026-10-20T10:00:00.000Z' });
    const [pattern] = updateMistakePatterns([], attempt);
    expect(pattern).toMatchObject({
      operation: 'multiplication',
      firstOperand: 8,
      secondOperand: 7,
      correctAnswer: 56,
      difficulty: 2,
      incorrectCount: 1,
      similarCorrectCount: 0,
      firstIncorrectAt: '2026-10-20T10:00:00.000Z',
      lastIncorrectAt: '2026-10-20T10:00:00.000Z',
      mastered: false,
    });
    expect(pattern.id).toMatch(/^mistake_/);
  });

  it('ignores correct answers', () => {
    const patterns: MistakePattern[] = [];
    expect(updateMistakePatterns(patterns, wrong({ selfReportedCorrect: true }))).toBe(patterns);
  });
});

describe('updating existing patterns (task 52)', () => {
  it('counts a repeated mistake on the same record instead of adding a duplicate', () => {
    let patterns = updateMistakePatterns([], wrong({ attemptedAt: '2026-10-20T10:00:00.000Z' }));
    patterns = updateMistakePatterns(patterns, wrong({ attemptedAt: '2026-10-21T09:00:00.000Z' }));
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      incorrectCount: 2,
      firstIncorrectAt: '2026-10-20T10:00:00.000Z',
      lastIncorrectAt: '2026-10-21T09:00:00.000Z',
    });
  });

  it('starts mastery over, and brings a mastered fact back, after a new mistake', () => {
    const mastered = { ...createMistakePattern(wrong()), similarCorrectCount: 3, mastered: true };
    const [updated] = updateMistakePatterns([mastered], wrong());
    expect(updated).toMatchObject({ similarCorrectCount: 0, mastered: false, incorrectCount: 2 });
  });

  it('keeps different facts as separate patterns, including reversed operands', () => {
    let patterns = updateMistakePatterns([], wrong());
    patterns = updateMistakePatterns(patterns, wrong({ firstOperand: 7, secondOperand: 8 }));
    patterns = updateMistakePatterns(
      patterns,
      wrong({ operation: 'addition', firstOperand: 8, secondOperand: 7, correctAnswer: 15 }),
    );
    expect(patterns).toHaveLength(3);
  });
});

describe('limitPatterns', () => {
  it(`keeps at most ${MAX_STORED_MISTAKES}, dropping mastered and then the oldest first`, () => {
    const many = Array.from({ length: MAX_STORED_MISTAKES + 2 }, (_, i) => ({
      ...createMistakePattern(wrong({ firstOperand: i })),
      lastIncorrectAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    }));
    many[100] = { ...many[100], mastered: true };
    const kept = limitPatterns(many);
    expect(kept).toHaveLength(MAX_STORED_MISTAKES);
    expect(kept.find((p) => p.id === many[100].id)).toBeUndefined();
    expect(kept.find((p) => p.id === many[0].id)).toBeUndefined(); // oldest active
    expect(kept.find((p) => p.id === many.at(-1)!.id)).toBeDefined();
  });
});
