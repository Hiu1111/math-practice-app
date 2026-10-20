import type { PracticeAttempt, PracticeSession } from '../types';

let n = 0;

export function makeAttempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  n += 1;
  return {
    id: `attempt_${n}`,
    questionId: `q_${n}`,
    operation: 'addition',
    firstOperand: 2,
    secondOperand: 3,
    correctAnswer: 5,
    selectedAnswer: 5,
    selfReportedCorrect: true,
    difficulty: 1,
    source: 'regular',
    attemptedAt: new Date(Date.UTC(2026, 9, 20, 10, 0, n)).toISOString(),
    sessionId: 'session_1',
    ...overrides,
  };
}

export function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  n += 1;
  return {
    id: `session_${n}`,
    startedAt: new Date(Date.UTC(2026, 9, 20, 9, 0, n)).toISOString(),
    completedAt: new Date(Date.UTC(2026, 9, 20, 9, 5, n)).toISOString(),
    operations: ['addition'],
    difficulty: 1,
    sessionLength: 5,
    reviewMode: 'regular',
    attempted: 5,
    correct: 3,
    incorrect: 2,
    reviewQuestionsCompleted: 0,
    ...overrides,
  };
}
