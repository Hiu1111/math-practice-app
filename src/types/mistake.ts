import type { DifficultyLevel, MathOperation } from './question';

/** A remembered incorrect question used to generate similar practice (spec §10.3). */
export interface MistakePattern {
  id: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
  difficulty: DifficultyLevel;
  incorrectCount: number;
  /** Similar questions later answered correctly; resets toward 0 on a new mistake. */
  similarCorrectCount: number;
  /** ISO 8601 timestamp of the first time this pattern was missed. */
  firstIncorrectAt: string;
  /** ISO 8601 timestamp of the most recent miss. */
  lastIncorrectAt: string;
  mastered: boolean;
}

/** Default number of correct similar answers needed to master a pattern (spec §6.4). */
export const DEFAULT_MASTERY_THRESHOLD = 3;
