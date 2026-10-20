import {
  CHOICE_COUNT,
  DEFAULT_SETTINGS,
  DIFFICULTY_LEVELS,
  MATH_OPERATIONS,
  MAX_MASTERY_THRESHOLD,
  MIN_MASTERY_THRESHOLD,
  SESSION_LENGTHS,
  type AppSettings,
  type AppStatistics,
  type MistakePattern,
  type OperationStatistics,
  type PracticeAttempt,
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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isWhole = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

/** A session record as stored in localStorage; it may be unfinished (no completedAt). */
export function isStoredSession(value: unknown): value is PracticeSession {
  if (!isObject(value)) return false;
  const s = value;
  return (
    typeof s.id === 'string' &&
    typeof s.startedAt === 'string' &&
    (s.completedAt === undefined || typeof s.completedAt === 'string') &&
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

/** Runtime check for a finished session passed to the summary page. */
export function isCompletedSession(
  value: unknown,
): value is PracticeSession & { completedAt: string } {
  return isStoredSession(value) && typeof value.completedAt === 'string';
}

/** One stored practice attempt (spec 10.1). */
export function isValidAttempt(value: unknown): value is PracticeAttempt {
  if (!isObject(value)) return false;
  const a = value;
  return (
    typeof a.id === 'string' &&
    typeof a.questionId === 'string' &&
    isMathOperation(a.operation) &&
    isWhole(a.firstOperand) &&
    isWhole(a.secondOperand) &&
    isWhole(a.correctAnswer) &&
    isWhole(a.selectedAnswer) &&
    typeof a.selfReportedCorrect === 'boolean' &&
    isDifficultyLevel(a.difficulty) &&
    (a.source === 'regular' || a.source === 'mistake-review') &&
    typeof a.attemptedAt === 'string' &&
    typeof a.sessionId === 'string' &&
    (a.mistakePatternId === undefined || typeof a.mistakePatternId === 'string')
  );
}

function isTotals(value: unknown): value is OperationStatistics {
  return (
    isObject(value) &&
    isCount(value.attempted) &&
    isCount(value.correct) &&
    isCount(value.incorrect) &&
    value.correct + value.incorrect === value.attempted
  );
}

/** Aggregate statistics (spec 10.4): every total must add up. */
export function isValidStatistics(value: unknown): value is AppStatistics {
  if (!isTotals(value)) return false;
  const v = value as unknown as Record<string, unknown>;
  const byOperation = v.byOperation;
  const byDifficulty = v.byDifficulty;
  return (
    isObject(byOperation) &&
    MATH_OPERATIONS.every((op) => isTotals(byOperation[op])) &&
    isObject(byDifficulty) &&
    DIFFICULTY_LEVELS.every((level) => isTotals(byDifficulty[level])) &&
    isTotals(v.review)
  );
}

/** One stored mistake pattern (spec 10.3). */
export function isValidMistakePattern(value: unknown): value is MistakePattern {
  if (!isObject(value)) return false;
  const m = value;
  return (
    typeof m.id === 'string' &&
    isMathOperation(m.operation) &&
    isWhole(m.firstOperand) &&
    isWhole(m.secondOperand) &&
    isWhole(m.correctAnswer) &&
    isDifficultyLevel(m.difficulty) &&
    isCount(m.incorrectCount) &&
    m.incorrectCount >= 1 &&
    isCount(m.similarCorrectCount) &&
    typeof m.firstIncorrectAt === 'string' &&
    typeof m.lastIncorrectAt === 'string' &&
    typeof m.mastered === 'boolean' &&
    !(m.operation === 'division' && m.secondOperand === 0)
  );
}

/**
 * Turn whatever was stored into valid settings: each valid field is kept and
 * each missing or invalid field falls back to its default (TODO task 37).
 */
export function sanitizeSettings(value: unknown): { settings: AppSettings; repaired: boolean } {
  const raw = isObject(value) ? value : {};
  const d = DEFAULT_SETTINGS;
  const bool = (key: 'soundEffects' | 'cardAnimation' | 'showExplanations' | 'feedbackMessages') =>
    typeof raw[key] === 'boolean' ? (raw[key] as boolean) : d[key];

  const ops = raw.defaultOperations;
  const validOps =
    Array.isArray(ops) &&
    ops.length > 0 &&
    ops.every(isMathOperation) &&
    new Set(ops).size === ops.length;
  const threshold = raw.masteryThreshold;

  const settings: AppSettings = {
    soundEffects: bool('soundEffects'),
    cardAnimation: bool('cardAnimation'),
    showExplanations: bool('showExplanations'),
    feedbackMessages: bool('feedbackMessages'),
    defaultSessionLength: (SESSION_LENGTHS as readonly unknown[]).includes(raw.defaultSessionLength)
      ? (raw.defaultSessionLength as AppSettings['defaultSessionLength'])
      : d.defaultSessionLength,
    defaultDifficulty: isDifficultyLevel(raw.defaultDifficulty)
      ? raw.defaultDifficulty
      : d.defaultDifficulty,
    defaultOperations: validOps
      ? MATH_OPERATIONS.filter((op) => (ops as unknown[]).includes(op))
      : [...d.defaultOperations],
    masteryThreshold:
      isWhole(threshold) && threshold >= MIN_MASTERY_THRESHOLD && threshold <= MAX_MASTERY_THRESHOLD
        ? threshold
        : d.masteryThreshold,
  };

  const repaired =
    !isObject(value) ||
    (Object.keys(settings) as (keyof AppSettings)[]).some(
      (key) => JSON.stringify(raw[key]) !== JSON.stringify(settings[key]),
    );
  return { settings, repaired };
}
