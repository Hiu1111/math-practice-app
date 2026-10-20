import { seededRng } from '../test/seededRng';
import { DIFFICULTY_LEVELS, MATH_OPERATIONS, type DifficultyLevel, type Question } from '../types';
import { DIFFICULTY_RULES, operandsMatchDifficulty } from './difficultyRules';
import {
  MAX_GENERATION_ATTEMPTS,
  createFallbackQuestion,
  generateAdditionOperands,
  generateDivisionOperands,
  generateMultiplicationOperands,
  generateQuestion,
  generateQuestionForOperations,
  generateSubtractionOperands,
  pickOperation,
  questionProblems,
} from './questionGenerator';

const RUNS = 400;

describe('addition questions', () => {
  it.each(DIFFICULTY_LEVELS)('stays within operand and result limits at level %i', (level) => {
    const { operand, maxResult } = DIFFICULTY_RULES[level].addition;
    const rng = seededRng(level);
    let sawMin = false;
    let sawMax = false;
    for (let i = 0; i < RUNS * 5; i++) {
      const { firstOperand: a, secondOperand: b } = generateAdditionOperands(level, rng);
      expect(a).toBeGreaterThanOrEqual(operand.min);
      expect(a).toBeLessThanOrEqual(operand.max);
      expect(b).toBeGreaterThanOrEqual(operand.min);
      expect(b).toBeLessThanOrEqual(operand.max);
      expect(a + b).toBeLessThanOrEqual(maxResult);
      sawMin ||= a === operand.min || b === operand.min;
      sawMax ||= a === operand.max || b === operand.max;
    }
    expect(sawMin).toBe(true);
    expect(sawMax).toBe(true);
  });

  it('keeps Level 1 sums at 20 or less (spec 7.1)', () => {
    for (let i = 0; i < RUNS; i++) {
      const q = generateQuestion('addition', 1);
      expect(q.correctAnswer).toBeLessThanOrEqual(20);
    }
  });
});

describe('subtraction questions', () => {
  it.each(DIFFICULTY_LEVELS)('never gives a negative answer at level %i', (level) => {
    const rng = seededRng(10 + level);
    for (let i = 0; i < RUNS; i++) {
      const { firstOperand: a, secondOperand: b } = generateSubtractionOperands(level, rng);
      expect(a).toBeGreaterThanOrEqual(b);
      expect(operandsMatchDifficulty('subtraction', a, b, level)).toBe(true);
    }
  });
});

describe('multiplication questions', () => {
  it.each(DIFFICULTY_LEVELS)('uses factors from the level %i ranges', (level) => {
    const rng = seededRng(20 + level);
    for (let i = 0; i < RUNS; i++) {
      const { firstOperand: a, secondOperand: b } = generateMultiplicationOperands(level, rng);
      expect(operandsMatchDifficulty('multiplication', a, b, level)).toBe(true);
    }
  });

  it('uses factors 0–5 at Level 1 and 0–10 at Level 2', () => {
    for (const [level, max] of [
      [1, 5],
      [2, 10],
    ] as const) {
      for (let i = 0; i < RUNS; i++) {
        const { firstOperand: a, secondOperand: b } = generateMultiplicationOperands(level);
        expect(Math.max(a, b)).toBeLessThanOrEqual(max);
        expect(Math.min(a, b)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('includes one-digit × two-digit questions at Level 3', () => {
    const rng = seededRng(3);
    const big = Array.from({ length: RUNS }, () => generateMultiplicationOperands(3, rng)).filter(
      ({ firstOperand: a, secondOperand: b }) => Math.max(a, b) >= 10,
    );
    expect(big.length).toBeGreaterThan(0);
  });

  it('puts the larger factor first sometimes and second sometimes', () => {
    const rng = seededRng(4);
    const results = Array.from({ length: RUNS }, () => generateMultiplicationOperands(4, rng));
    expect(results.some((r) => r.firstOperand > r.secondOperand)).toBe(true);
    expect(results.some((r) => r.firstOperand < r.secondOperand)).toBe(true);
  });
});

describe('division questions', () => {
  it.each(DIFFICULTY_LEVELS)(
    'never divides by zero and always has a whole answer at level %i',
    (level) => {
      const rng = seededRng(30 + level);
      for (let i = 0; i < RUNS; i++) {
        const q = generateQuestion('division', level, { rng });
        expect(q.secondOperand).not.toBe(0);
        expect(q.firstOperand % q.secondOperand).toBe(0);
        expect(Number.isInteger(q.correctAnswer)).toBe(true);
        expect(q.correctAnswer).toBe(q.firstOperand / q.secondOperand);
      }
    },
  );

  it('builds the dividend from divisor × quotient (spec section 9)', () => {
    // rng 0 picks the smallest divisor and quotient.
    expect(generateDivisionOperands(1, () => 0)).toEqual({ firstOperand: 1, secondOperand: 1 });
    const q = generateQuestion('division', 3, { rng: seededRng(9) });
    expect(q.firstOperand).toBe(q.secondOperand * q.correctAnswer);
  });

  it('keeps Level 3 dividends at 144 or less with divisors up to 12 (spec 7.3)', () => {
    for (let i = 0; i < RUNS; i++) {
      const q = generateQuestion('division', 3);
      expect(q.firstOperand).toBeLessThanOrEqual(144);
      expect(q.secondOperand).toBeLessThanOrEqual(12);
    }
  });
});

describe('generateQuestion', () => {
  it.each(MATH_OPERATIONS.flatMap((op) => DIFFICULTY_LEVELS.map((level) => [op, level] as const)))(
    'produces valid %s questions at level %i',
    (operation, level) => {
      const rng = seededRng(level * 100 + operation.length);
      for (let i = 0; i < RUNS; i++) {
        const q = generateQuestion(operation, level, { rng });
        expect(questionProblems(q)).toEqual([]);
        expect(q.operation).toBe(operation);
        expect(q.difficulty).toBe(level);
        expect(q.source).toBe('regular');
        expect(q.choices).toHaveLength(4);
      }
    },
  );

  it('builds display text with the right symbol', () => {
    const symbols = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };
    for (const op of MATH_OPERATIONS) {
      const q = generateQuestion(op, 2);
      expect(q.displayText).toBe(`${q.firstOperand} ${symbols[op]} ${q.secondOperand}`);
    }
  });

  it('gives every question a unique id', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateQuestion('addition', 1).id));
    expect(ids.size).toBe(200);
  });

  it('avoids immediately repeating the previous question', () => {
    const rng = seededRng(5);
    let previous: Question | null = null;
    for (let i = 0; i < RUNS; i++) {
      const q: Question = generateQuestion('multiplication', 1, { rng, avoid: previous });
      if (previous) {
        const same =
          q.firstOperand === previous.firstOperand && q.secondOperand === previous.secondOperand;
        expect(same).toBe(false);
      }
      previous = q;
    }
  });

  it('falls back to a valid question instead of crashing when generation keeps failing', () => {
    // A random source stuck at 0 always produces the same operands, so avoiding them
    // makes every attempt fail and forces the fallback path.
    const stuck = () => 0;
    const repeated = generateQuestion('addition', 1, { rng: stuck });
    const q = generateQuestion('addition', 1, { rng: stuck, avoid: repeated });
    expect(questionProblems(q)).toEqual([]);
    expect(MAX_GENERATION_ATTEMPTS).toBeGreaterThan(0);
  });

  it('rejects unsupported operations', () => {
    // @ts-expect-error testing a runtime guard
    expect(() => generateQuestion('exponents', 1)).toThrow(/unsupported/i);
  });
});

describe('createFallbackQuestion', () => {
  it.each(MATH_OPERATIONS.flatMap((op) => DIFFICULTY_LEVELS.map((level) => [op, level] as const)))(
    'is valid for %s at level %i',
    (operation, level: DifficultyLevel) => {
      expect(questionProblems(createFallbackQuestion(operation, level))).toEqual([]);
    },
  );
});

describe('mixed operations', () => {
  it('only picks from the selected operations, and uses each of them', () => {
    const rng = seededRng(6);
    const seen = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const q = generateQuestionForOperations(['subtraction', 'division'], 2, { rng });
      expect(['subtraction', 'division']).toContain(q.operation);
      seen.add(q.operation);
    }
    expect(seen.size).toBe(2);
  });

  it('requires at least one operation', () => {
    expect(() => pickOperation([])).toThrow();
  });
});
