import type { DifficultyLevel, MathOperation } from '../types';

/**
 * Number ranges for each difficulty level (spec section 7).
 *
 * Where the spec is loose, these are the concrete choices:
 * - Division quotients start at 1, so there are no "0 ÷ n" questions.
 * - Level 3 multiplication is 1-digit × 1-digit or 1-digit × 2-digit, using
 *   factors from 2 (×0 and ×1 belong to the easier levels).
 * - Level 4 addition/subtraction use multi-digit numbers from 10 to 999.
 * - Level 4 division uses divisors 2–19 and quotients 10–50.
 * - Negative subtraction answers are off at every level (the spec makes them optional).
 */

export interface NumberRange {
  min: number;
  max: number;
}

export interface AdditionRule {
  operand: NumberRange;
  maxResult: number;
}

export interface SubtractionRule {
  operand: NumberRange;
  allowNegative: boolean;
}

export interface MultiplicationRule {
  /** One pair is picked at random; the factors may then appear in either order. */
  factorPairs: ReadonlyArray<readonly [NumberRange, NumberRange]>;
}

export interface DivisionRule {
  divisor: NumberRange;
  quotient: NumberRange;
}

export interface DifficultyRuleSet {
  addition: AdditionRule;
  subtraction: SubtractionRule;
  multiplication: MultiplicationRule;
  division: DivisionRule;
}

const range = (min: number, max: number): NumberRange => ({ min, max });

export const DIFFICULTY_RULES: Record<DifficultyLevel, DifficultyRuleSet> = {
  1: {
    addition: { operand: range(0, 10), maxResult: 20 },
    subtraction: { operand: range(0, 10), allowNegative: false },
    multiplication: { factorPairs: [[range(0, 5), range(0, 5)]] },
    division: { divisor: range(1, 5), quotient: range(1, 5) },
  },
  2: {
    addition: { operand: range(0, 50), maxResult: 100 },
    subtraction: { operand: range(0, 50), allowNegative: false },
    multiplication: { factorPairs: [[range(0, 10), range(0, 10)]] },
    division: { divisor: range(1, 10), quotient: range(1, 10) },
  },
  3: {
    addition: { operand: range(0, 100), maxResult: 200 },
    subtraction: { operand: range(0, 100), allowNegative: false },
    multiplication: {
      factorPairs: [
        [range(2, 9), range(2, 9)],
        [range(2, 9), range(10, 99)],
      ],
    },
    division: { divisor: range(1, 12), quotient: range(1, 12) },
  },
  4: {
    addition: { operand: range(10, 999), maxResult: 1998 },
    subtraction: { operand: range(10, 999), allowNegative: false },
    multiplication: {
      factorPairs: [
        [range(10, 99), range(2, 9)],
        [range(10, 99), range(10, 99)],
      ],
    },
    division: { divisor: range(2, 19), quotient: range(10, 50) },
  },
};

export function inRange(value: number, { min, max }: NumberRange): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

/** Whether negative answers (and therefore negative choices) are allowed. */
export function allowsNegativeAnswers(operation: MathOperation, difficulty: DifficultyLevel) {
  return operation === 'subtraction' && DIFFICULTY_RULES[difficulty].subtraction.allowNegative;
}

/** Whether two operands fit the rules for an operation at a difficulty level. */
export function operandsMatchDifficulty(
  operation: MathOperation,
  a: number,
  b: number,
  difficulty: DifficultyLevel,
): boolean {
  const rules = DIFFICULTY_RULES[difficulty];
  switch (operation) {
    case 'addition': {
      const { operand, maxResult } = rules.addition;
      return inRange(a, operand) && inRange(b, operand) && a + b <= maxResult;
    }
    case 'subtraction': {
      const { operand, allowNegative } = rules.subtraction;
      return inRange(a, operand) && inRange(b, operand) && (allowNegative || a >= b);
    }
    case 'multiplication':
      return rules.multiplication.factorPairs.some(
        ([r1, r2]) => (inRange(a, r1) && inRange(b, r2)) || (inRange(a, r2) && inRange(b, r1)),
      );
    case 'division': {
      const { divisor, quotient } = rules.division;
      return b !== 0 && a % b === 0 && inRange(b, divisor) && inRange(a / b, quotient);
    }
  }
}
