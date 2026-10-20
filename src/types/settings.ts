import { DEFAULT_MASTERY_THRESHOLD } from './mistake';
import type { DifficultyLevel, MathOperation } from './question';
import type { SessionLength } from './session';

/** Application-wide preferences stored in localStorage (spec §6.7). */
export interface AppSettings {
  soundEffects: boolean;
  cardAnimation: boolean;
  showExplanations: boolean;
  /** Show encouraging feedback messages after each answer (TODO task 73). */
  feedbackMessages: boolean;
  defaultSessionLength: SessionLength;
  defaultDifficulty: DifficultyLevel;
  defaultOperations: MathOperation[];
  masteryThreshold: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEffects: false,
  cardAnimation: true,
  showExplanations: true,
  feedbackMessages: true,
  defaultSessionLength: 10,
  defaultDifficulty: 1,
  defaultOperations: ['addition'],
  masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
};
