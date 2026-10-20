import { makeAttempt } from '../test/fixtures';
import type { MistakePattern } from '../types';
import {
  MAX_STORED_MISTAKES,
  activePatterns,
  createMistakePattern,
  isMastered,
  limitPatterns,
  pickReviewPattern,
  prioritizePatterns,
  priorityScore,
  reviewablePatterns,
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

describe('review results and mastery (tasks 61–62)', () => {
  const base = () => createMistakePattern(wrong({ attemptedAt: '2026-10-20T10:00:00.000Z' }));
  const review = (p: MistakePattern, correct: boolean, at = '2026-10-21T10:00:00.000Z') =>
    makeAttempt({
      source: 'mistake-review',
      mistakePatternId: p.id,
      selfReportedCorrect: correct,
      attemptedAt: at,
    });

  it('counts correct similar answers and masters the pattern after three (spec 6.4)', () => {
    let patterns = [base()];
    for (let i = 1; i <= 3; i++) {
      patterns = updateMistakePatterns(patterns, review(patterns[0], true), 3);
      expect(patterns[0].similarCorrectCount).toBe(i);
      expect(patterns[0].mastered).toBe(i === 3);
    }
  });

  it('uses the configured threshold', () => {
    let patterns = [base()];
    for (let i = 0; i < 3; i++)
      patterns = updateMistakePatterns(patterns, review(patterns[0], true), 5);
    expect(patterns[0].mastered).toBe(false);
    for (let i = 0; i < 2; i++)
      patterns = updateMistakePatterns(patterns, review(patterns[0], true), 5);
    expect(patterns[0].mastered).toBe(true);
  });

  it('a wrong review answer counts as a miss and moves progress back one step', () => {
    let patterns = [{ ...base(), similarCorrectCount: 2 }];
    patterns = updateMistakePatterns(patterns, review(patterns[0], false), 3);
    expect(patterns[0]).toMatchObject({
      similarCorrectCount: 1,
      incorrectCount: 2,
      lastIncorrectAt: '2026-10-21T10:00:00.000Z',
      mastered: false,
    });
    patterns = updateMistakePatterns(
      [{ ...patterns[0], similarCorrectCount: 0 }],
      review(patterns[0], false),
      3,
    );
    expect(patterns[0].similarCorrectCount).toBe(0);
  });

  it('ignores review answers for a pattern that no longer exists', () => {
    const patterns = [base()];
    const orphan = makeAttempt({ source: 'mistake-review', mistakePatternId: 'gone' });
    expect(updateMistakePatterns(patterns, orphan, 3)).toBe(patterns);
  });

  it('excludes mastered patterns from review, including after lowering the threshold', () => {
    const active = base();
    const mastered = { ...base(), id: 'm2', mastered: true };
    const nearly = { ...base(), id: 'm3', similarCorrectCount: 2 };
    expect(activePatterns([active, mastered, nearly], 3).map((p) => p.id)).toEqual([
      active.id,
      nearly.id,
    ]);
    expect(isMastered(nearly, 2)).toBe(true);
    expect(activePatterns([active, mastered, nearly], 2).map((p) => p.id)).toEqual([active.id]);
  });
});

describe('review priority (task 59)', () => {
  const now = new Date('2026-10-20T12:00:00.000Z');
  const p = (id: string, overrides: Partial<MistakePattern> = {}): MistakePattern => ({
    ...createMistakePattern(wrong()),
    id,
    lastIncorrectAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  });
  const order = (patterns: MistakePattern[]) =>
    prioritizePatterns(patterns, { now, masteryThreshold: 3, rng: () => 0 }).map((x) => x.id);

  it('puts frequently missed patterns first', () => {
    expect(order([p('once'), p('often', { incorrectCount: 4 })])).toEqual(['often', 'once']);
  });

  it('puts recently missed patterns first', () => {
    expect(order([p('old', { lastIncorrectAt: '2026-08-01T10:00:00.000Z' }), p('recent')])).toEqual(
      ['recent', 'old'],
    );
  });

  it('puts patterns with little successful review first', () => {
    expect(order([p('almost', { similarCorrectCount: 2 }), p('new')])).toEqual(['new', 'almost']);
  });

  it('randomizes patterns with the same priority', () => {
    const firsts = new Set<string>();
    for (let i = 0; i < 50; i++) {
      firsts.add(prioritizePatterns([p('a'), p('b')], { now, masteryThreshold: 3 })[0].id);
    }
    expect(firsts).toEqual(new Set(['a', 'b']));
  });

  it('scores higher for more misses, more recent misses and less progress', () => {
    const basePattern = p('x');
    const score = (q: MistakePattern) => priorityScore(q, now, 3);
    expect(score({ ...basePattern, incorrectCount: 3 })).toBeGreaterThan(score(basePattern));
    expect(score({ ...basePattern, lastIncorrectAt: '2026-01-01T00:00:00Z' })).toBeLessThan(
      score(basePattern),
    );
    expect(score({ ...basePattern, similarCorrectCount: 2 })).toBeLessThan(score(basePattern));
  });
});

describe('choosing patterns for a review session (task 60)', () => {
  const p = (id: string, op: MistakePattern['operation'] = 'multiplication', difficulty = 2) => ({
    ...createMistakePattern(wrong({ operation: op, difficulty })),
    id,
  });

  it('only reviews mistakes for the selected operations and level', () => {
    const patterns = [p('mul2'), p('add2', 'addition'), p('mul3', 'multiplication', 3)];
    expect(
      reviewablePatterns(patterns, { operations: ['multiplication'], difficulty: 2 }, 3).map(
        (x) => x.id,
      ),
    ).toEqual(['mul2']);
  });

  it('takes turns between mistakes instead of repeating the same one', () => {
    const patterns = [p('a'), p('b'), p('c')];
    let previous: string | undefined;
    const used = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const chosen = pickReviewPattern(patterns, { previousPatternId: previous })!;
      expect(chosen.id).not.toBe(previous);
      used.add(chosen.id);
      previous = chosen.id;
    }
    expect(used.size).toBe(3);
  });

  it('can repeat the only mistake left, and returns null when none are left', () => {
    const only = p('only');
    expect(pickReviewPattern([only], { previousPatternId: 'only' })?.id).toBe('only');
    expect(pickReviewPattern([{ ...only, mastered: true }])).toBeNull();
  });
});
