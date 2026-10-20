import type { DifficultyLevel, MathOperation, Question, QuestionSource } from '../types';
import { createId } from '../utils/ids';
import { randomChoice, randomInt, type RandomFn } from '../utils/math';
import { computeAnswer, formatQuestion, isMathOperation } from '../utils/operations';
import { validateQuestion } from '../utils/validation';
import {
  DIFFICULTY_RULES,
  allowsNegativeAnswers,
  operandsMatchDifficulty,
  type NumberRange,
} from './difficultyRules';
import { fallbackChoices, generateChoices } from './distractors';

/** How many times to retry before falling back to a known-good question. */
export const MAX_GENERATION_ATTEMPTS = 25;

export interface Operands {
  firstOperand: number;
  secondOperand: number;
}

const pick = (r: NumberRange, rng: RandomFn) => randomInt(r.min, r.max, rng);

// ------------------------------------------------------------------
// Operation-specific operand generators (TODO tasks 12–15)
// ------------------------------------------------------------------

export function generateAdditionOperands(
  difficulty: DifficultyLevel,
  rng: RandomFn = Math.random,
): Operands {
  const { operand, maxResult } = DIFFICULTY_RULES[difficulty].addition;
  // Choose the first number so that some second number can still keep the sum within maxResult.
  const first = randomInt(operand.min, Math.min(operand.max, maxResult - operand.min), rng);
  const second = randomInt(operand.min, Math.min(operand.max, maxResult - first), rng);
  return { firstOperand: first, secondOperand: second };
}

export function generateSubtractionOperands(
  difficulty: DifficultyLevel,
  rng: RandomFn = Math.random,
): Operands {
  const { operand, allowNegative } = DIFFICULTY_RULES[difficulty].subtraction;
  let first = pick(operand, rng);
  let second = pick(operand, rng);
  if (!allowNegative && first < second) [first, second] = [second, first];
  return { firstOperand: first, secondOperand: second };
}

export function generateMultiplicationOperands(
  difficulty: DifficultyLevel,
  rng: RandomFn = Math.random,
): Operands {
  const [r1, r2] = randomChoice(DIFFICULTY_RULES[difficulty].multiplication.factorPairs, rng);
  const f1 = pick(r1, rng);
  const f2 = pick(r2, rng);
  // Show "7 × 34" and "34 × 7" equally often.
  return rng() < 0.5
    ? { firstOperand: f1, secondOperand: f2 }
    : { firstOperand: f2, secondOperand: f1 };
}

/** Division is built backwards (spec section 9): pick a nonzero divisor and a whole quotient, then multiply. */
export function generateDivisionOperands(
  difficulty: DifficultyLevel,
  rng: RandomFn = Math.random,
): Operands {
  const { divisor: divisorRange, quotient: quotientRange } = DIFFICULTY_RULES[difficulty].division;
  const divisor = randomInt(Math.max(1, divisorRange.min), divisorRange.max, rng);
  const quotient = pick(quotientRange, rng);
  return { firstOperand: divisor * quotient, secondOperand: divisor };
}

const OPERAND_GENERATORS: Record<MathOperation, (d: DifficultyLevel, rng: RandomFn) => Operands> = {
  addition: generateAdditionOperands,
  subtraction: generateSubtractionOperands,
  multiplication: generateMultiplicationOperands,
  division: generateDivisionOperands,
};

// ------------------------------------------------------------------
// Building and validating questions
// ------------------------------------------------------------------

export interface BuildQuestionInput extends Operands {
  operation: MathOperation;
  difficulty: DifficultyLevel;
  source?: QuestionSource;
  mistakePatternId?: string;
  rng?: RandomFn;
}

/** Turn two operands into a complete Question with answer, display text and shuffled choices. */
export function buildQuestion({
  operation,
  firstOperand,
  secondOperand,
  difficulty,
  source = 'regular',
  mistakePatternId,
  rng = Math.random,
}: BuildQuestionInput): Question {
  const correctAnswer = computeAnswer(operation, firstOperand, secondOperand);
  return {
    id: createId('q'),
    operation,
    firstOperand,
    secondOperand,
    displayText: formatQuestion(operation, firstOperand, secondOperand),
    correctAnswer,
    choices: generateChoices(operation, firstOperand, secondOperand, correctAnswer, {
      allowNegative: allowsNegativeAnswers(operation, difficulty),
      rng,
    }),
    difficulty,
    source,
    ...(mistakePatternId ? { mistakePatternId } : {}),
  };
}

/** All problems with a question, including whether it fits its difficulty level. */
export function questionProblems(question: Question): string[] {
  const errors = validateQuestion(question, {
    allowNegative: allowsNegativeAnswers(question.operation, question.difficulty),
  });
  if (
    errors.length === 0 &&
    !operandsMatchDifficulty(
      question.operation,
      question.firstOperand,
      question.secondOperand,
      question.difficulty,
    )
  ) {
    errors.push(`Operands do not match difficulty level ${question.difficulty}`);
  }
  return errors;
}

/** Same arithmetic fact (ignoring id and choice order). */
export function isSameQuestion(
  a: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'>,
  b: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'>,
): boolean {
  return (
    a.operation === b.operation &&
    a.firstOperand === b.firstOperand &&
    a.secondOperand === b.secondOperand
  );
}

/** A simple question that is always valid for its level; used only if generation keeps failing. */
export function createFallbackQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  rng: RandomFn = Math.random,
): Question {
  const rules = DIFFICULTY_RULES[difficulty];
  let operands: Operands;
  switch (operation) {
    case 'addition': {
      const n = rules.addition.operand.min + 1;
      operands = { firstOperand: n, secondOperand: n };
      break;
    }
    case 'subtraction': {
      const n = rules.subtraction.operand.min;
      operands = { firstOperand: n + 2, secondOperand: n + 1 };
      break;
    }
    case 'multiplication': {
      const [r1, r2] = rules.multiplication.factorPairs[0];
      operands = { firstOperand: r1.min + 1, secondOperand: r2.min + 1 };
      break;
    }
    case 'division': {
      const divisor = Math.max(1, rules.division.divisor.min) + 1;
      operands = {
        firstOperand: divisor * (rules.division.quotient.min + 1),
        secondOperand: divisor,
      };
      break;
    }
  }
  const correctAnswer = computeAnswer(operation, operands.firstOperand, operands.secondOperand);
  return {
    id: createId('q'),
    operation,
    ...operands,
    displayText: formatQuestion(operation, operands.firstOperand, operands.secondOperand),
    correctAnswer,
    choices: fallbackChoices(correctAnswer, rng),
    difficulty,
    source: 'regular',
  };
}

function reportProblem(message: string, detail?: unknown) {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.warn(`[questionGenerator] ${message}`, detail ?? '');
  }
}

export interface GenerateQuestionOptions {
  rng?: RandomFn;
  /** A question not to repeat immediately (usually the previous one). */
  avoid?: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'> | null;
}

/**
 * Generate a validated question for one operation and difficulty (spec section 20.1).
 * Retries invalid or repeated questions up to MAX_GENERATION_ATTEMPTS times, then
 * returns a simple fallback question rather than crashing.
 */
export function generateQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  { rng = Math.random, avoid = null }: GenerateQuestionOptions = {},
): Question {
  if (!isMathOperation(operation)) {
    throw new Error(`Unsupported operation: ${String(operation)}`);
  }

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const operands = OPERAND_GENERATORS[operation](difficulty, rng);
      if (avoid && isSameQuestion({ operation, ...operands }, avoid)) continue;

      const question = buildQuestion({ operation, difficulty, ...operands, rng });
      const problems = questionProblems(question);
      if (problems.length === 0) return question;
      reportProblem(`Invalid question ${question.displayText}`, problems);
    } catch (error) {
      reportProblem('Question generation threw an error', error);
    }
  }

  reportProblem(`Using fallback question for ${operation} at level ${difficulty}`);
  return createFallbackQuestion(operation, difficulty, rng);
}

/** Pick one of the enabled operations at random. */
export function pickOperation(operations: readonly MathOperation[], rng: RandomFn = Math.random) {
  if (operations.length === 0) throw new Error('At least one operation must be selected');
  return randomChoice(operations, rng);
}

/** Generate a question for a session that may mix several operations (TODO task 16). */
export function generateQuestionForOperations(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  options: GenerateQuestionOptions = {},
): Question {
  const operation = pickOperation(operations, options.rng ?? Math.random);
  return generateQuestion(operation, difficulty, options);
}
