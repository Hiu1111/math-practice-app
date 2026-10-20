import type { DifficultyLevel, MathOperation } from './question';

/** Attempted / correct / incorrect counts for one slice of the data (spec §10.4). */
export interface OperationStatistics {
  attempted: number;
  correct: number;
  incorrect: number;
}

/** Aggregate statistics across all practice (spec §10.4). */
export interface AppStatistics {
  attempted: number;
  correct: number;
  incorrect: number;
  byOperation: Record<MathOperation, OperationStatistics>;
  byDifficulty: Record<DifficultyLevel, OperationStatistics>;
  /**
   * Totals for mistake-review (similar) questions only. Not in spec 10.4, but
   * spec 6.6 asks for "number of similar questions practiced". Added in schema v2.
   */
  review: OperationStatistics;
}

/** Mistake-review figures shown on the statistics page (spec §6.6). */
export interface MistakeStatistics {
  activePatterns: number;
  masteredPatterns: number;
  similarQuestionsPracticed: number;
  similarQuestionsCorrect: number;
  mostMissedOperation: MathOperation | null;
}

export function emptyOperationStatistics(): OperationStatistics {
  return { attempted: 0, correct: 0, incorrect: 0 };
}

export function emptyAppStatistics(): AppStatistics {
  return {
    attempted: 0,
    correct: 0,
    incorrect: 0,
    byOperation: {
      addition: emptyOperationStatistics(),
      subtraction: emptyOperationStatistics(),
      multiplication: emptyOperationStatistics(),
      division: emptyOperationStatistics(),
    },
    byDifficulty: {
      1: emptyOperationStatistics(),
      2: emptyOperationStatistics(),
      3: emptyOperationStatistics(),
      4: emptyOperationStatistics(),
    },
    review: emptyOperationStatistics(),
  };
}
