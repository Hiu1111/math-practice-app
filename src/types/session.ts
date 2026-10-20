import type { DifficultyLevel, MathOperation, QuestionSource } from './question';

/** Number of questions in a session, or open-ended practice (spec §6.2). */
export type SessionLength = 5 | 10 | 20 | 'continuous';

export const SESSION_LENGTHS: readonly SessionLength[] = [5, 10, 20, 'continuous'] as const;

/** Regular practice or practice built from previous mistakes (spec §6.2). */
export type ReviewMode = 'regular' | 'mistake-review';

/** The configuration chosen on the practice setup page. */
export interface SessionConfig {
  operations: MathOperation[];
  difficulty: DifficultyLevel;
  sessionLength: SessionLength;
  reviewMode: ReviewMode;
}

/** One recorded answer (spec §10.1). */
export interface PracticeAttempt {
  id: string;
  questionId: string;
  operation: MathOperation;
  firstOperand: number;
  secondOperand: number;
  correctAnswer: number;
  selectedAnswer: number;
  selfReportedCorrect: boolean;
  difficulty: DifficultyLevel;
  source: QuestionSource;
  /** ISO 8601 timestamp. */
  attemptedAt: string;
  sessionId: string;
  /** Set when the question was generated from a mistake pattern. */
  mistakePatternId?: string;
}

/** A practice session and its running totals (spec §10.2). */
export interface PracticeSession {
  id: string;
  /** ISO 8601 timestamp. */
  startedAt: string;
  /** ISO 8601 timestamp; absent while the session is in progress. */
  completedAt?: string;
  operations: MathOperation[];
  difficulty: DifficultyLevel;
  sessionLength: SessionLength;
  reviewMode: ReviewMode;
  attempted: number;
  correct: number;
  incorrect: number;
  /** Number of mistake-review questions completed in this session (spec §6.5). */
  reviewQuestionsCompleted: number;
}
