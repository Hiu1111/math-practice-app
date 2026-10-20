/** The four arithmetic operations supported by the app (spec §8.1). */
export type MathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

/** Difficulty levels: 1 Beginner, 2 Easy, 3 Intermediate, 4 Advanced (spec §7). */
export type DifficultyLevel = 1 | 2 | 3 | 4;

/** Where a question came from: normal practice or a mistake-review session. */
export type QuestionSource = 'regular' | 'mistake-review';

export const MATH_OPERATIONS: readonly MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
] as const;

export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4] as const;

/** Every question shows exactly this many answer choices (spec §8.2). */
export const CHOICE_COUNT = 4;

export interface Question {
  id: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  displayText: string;
  correctAnswer: number;
  /** Exactly four unique choices, one of which equals correctAnswer. */
  choices: number[];
  difficulty: DifficultyLevel;
  source: QuestionSource;
  /** Set when source is 'mistake-review'. */
  mistakePatternId?: string;
}
