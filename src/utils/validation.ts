import {
  CHOICE_COUNT,
  SESSION_LENGTHS,
  type PracticeSession,
  type Question,
  type SessionConfig,
} from '../types';
import { computeAnswer, isDifficultyLevel, isMathOperation } from './operations';

export interface ValidateQuestionOptions {
  /** Whether negative answers and choices are allowed at this level. */
  allowNegative?: boolean;
}

/**
 * Check a question against the validation rules in spec §18.
 * Returns a list of problems; an empty list means the question is valid.
 * (Whether operands fit the difficulty level is checked by the generator.)
 */
export function validateQuestion(
  question: Question,
  { allowNegative = false }: ValidateQuestionOptions = {},
): string[] {
  const errors: string[] = [];
  const { operation, firstOperand: a, secondOperand: b, correctAnswer, choices } = question;

  if (!isMathOperation(operation)) {
    errors.push(`Unsupported operation: ${String(operation)}`);
    return errors;
  }
  if (!isDifficultyLevel(question.difficulty)) {
    errors.push(`Invalid difficulty: ${String(question.difficulty)}`);
  }
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    errors.push('Operands must be whole numbers');
  }
  if (operation === 'division') {
    if (b === 0) errors.push('Division by zero');
    else if (a % b !== 0) errors.push('Division answer is not a whole number');
  }

  if (!Number.isInteger(correctAnswer)) {
    errors.push('Correct answer must be a whole number');
  } else if (b !== 0 || operation !== 'division') {
    if (computeAnswer(operation, a, b) !== correctAnswer) errors.push('Correct answer is wrong');
  }
  if (!allowNegative && correctAnswer < 0) errors.push('Negative answer not allowed');

  if (!Array.isArray(choices) || choices.length !== CHOICE_COUNT) {
    errors.push(`There must be exactly ${CHOICE_COUNT} choices`);
    return errors;
  }
  if (new Set(choices).size !== choices.length) errors.push('Choices must be unique');
  if (choices.filter((c) => c === correctAnswer).length !== 1) {
    errors.push('Correct answer must appear exactly once in the choices');
  }
  if (choices.some((c) => !Number.isInteger(c))) errors.push('Choices must be whole numbers');
  if (!allowNegative && choices.some((c) => c < 0)) errors.push('Negative choice not allowed');

  return errors;
}

/** Runtime check for a practice configuration passed between pages. */
export function isValidSessionConfig(value: unknown): value is SessionConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Record<string, unknown>;
  const { operations } = config;
  return (
    Array.isArray(operations) &&
    operations.length > 0 &&
    operations.every(isMathOperation) &&
    new Set(operations).size === operations.length &&
    isDifficultyLevel(config.difficulty) &&
    (SESSION_LENGTHS as readonly unknown[]).includes(config.sessionLength) &&
    (config.reviewMode === 'regular' || config.reviewMode === 'mistake-review')
  );
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** Runtime check for a finished session passed to the summary page. */
export function isCompletedSession(value: unknown): value is PracticeSession {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.startedAt === 'string' &&
    typeof s.completedAt === 'string' &&
    isValidSessionConfig({
      operations: s.operations,
      difficulty: s.difficulty,
      sessionLength: s.sessionLength,
      reviewMode: s.reviewMode,
    }) &&
    isCount(s.attempted) &&
    isCount(s.correct) &&
    isCount(s.incorrect) &&
    isCount(s.reviewQuestionsCompleted) &&
    s.correct + s.incorrect === s.attempted
  );
}
