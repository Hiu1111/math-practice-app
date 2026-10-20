import { seededRng } from '../test/seededRng';
import { DIFFICULTY_LEVELS, MATH_OPERATIONS, type MistakePattern, type Question } from '../types';
import { createMistakePattern } from './mistakeService';
import { generateQuestion, isSameQuestion, questionProblems } from './questionGenerator';
import {
  factFamilyCandidates,
  generateSimilarQuestion,
  listSimilarCandidates,
  reversedCandidates,
} from './similarQuestionGenerator';
import { makeAttempt } from '../test/fixtures';

function pattern(overrides: Partial<MistakePattern>): MistakePattern {
  return {
    id: 'mistake_test',
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
    ...overrides,
  };
}

const text = (c: { operation: string; firstOperand: number; secondOperand: number }) =>
  `${c.firstOperand} ${{ addition: '+', subtraction: '−', multiplication: '×', division: '÷' }[c.operation]} ${c.secondOperand}`;

describe('the spec 6.4 example: 8 × 7 missed', () => {
  it('can produce every similar question the spec lists', () => {
    const texts = listSimilarCandidates(pattern({})).map(text);
    for (const expected of ['7 × 8', '8 × 6', '9 × 7', '56 ÷ 7', '56 ÷ 8']) {
      expect(texts).toContain(expected);
    }
    expect(texts).not.toContain('8 × 7'); // not the original question
  });
});

describe('nearby numbers (task 54)', () => {
  it('stays inside the same difficulty range', () => {
    // Level 1 factors are 0–5, so 5 × 5 cannot go up to 6 or 7.
    const texts = listSimilarCandidates(
      pattern({ firstOperand: 5, secondOperand: 5, correctAnswer: 25, difficulty: 1 }),
    ).map(text);
    expect(texts).toContain('4 × 5');
    expect(texts).not.toContain('6 × 5');
  });

  it('never makes a subtraction with a negative answer', () => {
    const p = pattern({
      operation: 'subtraction',
      firstOperand: 5,
      secondOperand: 4,
      correctAnswer: 1,
    });
    for (const c of listSimilarCandidates(p).filter((c) => c.operation === 'subtraction')) {
      expect(c.firstOperand).toBeGreaterThanOrEqual(c.secondOperand);
    }
  });

  it('keeps division answers whole and never divides by zero', () => {
    const p = pattern({
      operation: 'division',
      firstOperand: 12,
      secondOperand: 1,
      correctAnswer: 12,
    });
    const division = listSimilarCandidates({ ...p, difficulty: 3 }).filter(
      (c) => c.operation === 'division',
    );
    expect(division.length).toBeGreaterThan(0);
    for (const c of division) {
      expect(c.secondOperand).not.toBe(0);
      expect(c.firstOperand % c.secondOperand).toBe(0);
    }
  });
});

describe('reversed operands (task 55)', () => {
  it('reverses addition and multiplication', () => {
    expect(reversedCandidates(pattern({})).map(text)).toEqual(['7 × 8']);
    expect(
      reversedCandidates(pattern({ operation: 'addition', correctAnswer: 15 })).map(text),
    ).toEqual(['7 + 8']);
  });

  it('never treats reversed subtraction or division as equivalent', () => {
    expect(reversedCandidates(pattern({ operation: 'subtraction' }))).toEqual([]);
    expect(reversedCandidates(pattern({ operation: 'division' }))).toEqual([]);
  });

  it('has nothing to reverse when both operands are equal', () => {
    expect(reversedCandidates(pattern({ firstOperand: 6, secondOperand: 6 }))).toEqual([]);
  });
});

describe('fact families (task 56)', () => {
  it.each([
    [pattern({}), ['56 ÷ 7', '56 ÷ 8']],
    [
      pattern({ operation: 'division', firstOperand: 56, secondOperand: 8, correctAnswer: 7 }),
      ['8 × 7', '7 × 8'],
    ],
    [
      pattern({ operation: 'addition', firstOperand: 6, secondOperand: 9, correctAnswer: 15 }),
      ['15 − 9', '15 − 6'],
    ],
    [
      pattern({ operation: 'subtraction', firstOperand: 15, secondOperand: 9, correctAnswer: 6 }),
      ['9 + 6', '6 + 9'],
    ],
  ])('turns %o into the inverse operation', (p, expected) => {
    expect(factFamilyCandidates(p).map(text)).toEqual(expected);
  });

  it('only keeps fact-family questions that fit the selected difficulty', () => {
    // Level 1 subtraction uses numbers up to 10, so 15 − 8 is not allowed there.
    const p = pattern({
      operation: 'addition',
      firstOperand: 7,
      secondOperand: 8,
      correctAnswer: 15,
      difficulty: 1,
    });
    expect(listSimilarCandidates(p).some((c) => c.operation === 'subtraction')).toBe(false);
  });

  it('never makes a division by zero from a multiplication by zero', () => {
    const p = pattern({ firstOperand: 0, secondOperand: 7, correctAnswer: 0 });
    expect(factFamilyCandidates(p).map(text)).toEqual(['0 ÷ 7']);
  });
});

describe('generateSimilarQuestion (task 57)', () => {
  it.each(MATH_OPERATIONS.flatMap((op) => DIFFICULTY_LEVELS.map((level) => [op, level] as const)))(
    'makes valid, level-matched review questions for %s mistakes at level %i',
    (operation, level) => {
      const rng = seededRng(level * 10 + operation.length);
      for (let i = 0; i < 100; i++) {
        // A realistic mistake: any question the app could have asked at this level.
        const original = generateQuestion(operation, level, { rng });
        const mistake = createMistakePattern(
          makeAttempt({ ...original, selfReportedCorrect: false, difficulty: level }),
        );
        const q = generateSimilarQuestion(mistake, { rng });
        expect(questionProblems(q)).toEqual([]);
        expect(q.source).toBe('mistake-review');
        expect(q.mistakePatternId).toBe(mistake.id);
        expect(q.difficulty).toBe(level);
      }
    },
  );

  it('uses every strategy, and avoids repeating the previous question', () => {
    const p = pattern({});
    const rng = seededRng(7);
    const strategies = new Set<string>();
    let previous: Question | null = null;
    for (let i = 0; i < 200; i++) {
      const q: Question = generateSimilarQuestion(p, { rng, avoid: previous });
      if (previous) expect(isSameQuestion(q, previous)).toBe(false);
      expect(isSameQuestion(q, p)).toBe(false);
      if (q.operation === 'division') strategies.add('fact-family');
      else if (q.firstOperand === 7 && q.secondOperand === 8) strategies.add('reversed');
      else strategies.add('nearby');
      previous = q;
    }
    expect(strategies).toEqual(new Set(['nearby', 'reversed', 'fact-family']));
  });

  it('falls back to the original fact only when nothing similar fits', () => {
    // Level 1 division: divisor 1–5 and quotient 1–5. 1 ÷ 1 has few neighbours,
    // but there are some, so the original should not be used.
    const small = pattern({
      operation: 'division',
      firstOperand: 1,
      secondOperand: 1,
      correctAnswer: 1,
      difficulty: 1,
    });
    expect(isSameQuestion(generateSimilarQuestion(small), small)).toBe(false);
  });
});
