import { useCallback, useReducer } from 'react';
import { generateQuestionForOperations } from '../services/questionGenerator';
import type { PracticeAttempt, PracticeSession, Question, SessionConfig } from '../types';
import { createId } from '../utils/ids';

export type SessionStatus = 'active' | 'complete';

/** Everything the practice page needs to know about the running session (spec section 12). */
export interface PracticeSessionState {
  session: PracticeSession;
  status: SessionStatus;
  currentQuestion: Question;
  /** 0-based index of the current question; the card shows currentQuestionIndex + 1. */
  currentQuestionIndex: number;
  attempts: PracticeAttempt[];
}

export type PracticeSessionAction =
  | { type: 'recordAttempt'; attempt: PracticeAttempt; nextQuestion: Question | null }
  | { type: 'endSession'; completedAt: string };

/** Number of questions in a fixed-length session, or null for continuous practice. */
export function sessionTotal(session: Pick<PracticeSession, 'sessionLength'>): number | null {
  return session.sessionLength === 'continuous' ? null : session.sessionLength;
}

/** A fixed-length session is finished once the chosen number of questions has been attempted. */
export function hasReachedLength(session: Pick<PracticeSession, 'sessionLength' | 'attempted'>) {
  const total = sessionTotal(session);
  return total !== null && session.attempted >= total;
}

export function createSession(config: SessionConfig, startedAt: string): PracticeSession {
  return {
    id: createId('session'),
    startedAt,
    operations: [...config.operations],
    difficulty: config.difficulty,
    sessionLength: config.sessionLength,
    reviewMode: config.reviewMode,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    reviewQuestionsCompleted: 0,
  };
}

export function createInitialState(
  config: SessionConfig,
  firstQuestion: Question,
  startedAt: string,
): PracticeSessionState {
  return {
    session: createSession(config, startedAt),
    status: 'active',
    currentQuestion: firstQuestion,
    currentQuestionIndex: 0,
    attempts: [],
  };
}

export function createAttempt(
  question: Question,
  selectedAnswer: number,
  selfReportedCorrect: boolean,
  sessionId: string,
  attemptedAt: string,
): PracticeAttempt {
  return {
    id: createId('attempt'),
    questionId: question.id,
    operation: question.operation,
    firstOperand: question.firstOperand,
    secondOperand: question.secondOperand,
    correctAnswer: question.correctAnswer,
    selectedAnswer,
    selfReportedCorrect,
    difficulty: question.difficulty,
    source: question.source,
    attemptedAt,
    sessionId,
    ...(question.mistakePatternId ? { mistakePatternId: question.mistakePatternId } : {}),
  };
}

/**
 * Pure session reducer. Rejects attempts that break the spec 18 rules
 * (not for the current question, already recorded, answer not one of the choices),
 * so each question is counted exactly once.
 */
export function practiceSessionReducer(
  state: PracticeSessionState,
  action: PracticeSessionAction,
): PracticeSessionState {
  if (state.status !== 'active') return state;

  switch (action.type) {
    case 'recordAttempt': {
      const { attempt, nextQuestion } = action;
      const question = state.currentQuestion;
      if (attempt.questionId !== question.id) return state;
      if (state.attempts.some((a) => a.questionId === attempt.questionId)) return state;
      if (!question.choices.includes(attempt.selectedAnswer)) return state;

      const correct = attempt.selfReportedCorrect;
      const session: PracticeSession = {
        ...state.session,
        attempted: state.session.attempted + 1,
        correct: state.session.correct + (correct ? 1 : 0),
        incorrect: state.session.incorrect + (correct ? 0 : 1),
        reviewQuestionsCompleted:
          state.session.reviewQuestionsCompleted + (attempt.source === 'mistake-review' ? 1 : 0),
      };
      const attempts = [...state.attempts, attempt];

      if (hasReachedLength(session) || nextQuestion === null) {
        return {
          ...state,
          status: 'complete',
          session: { ...session, completedAt: attempt.attemptedAt },
          attempts,
        };
      }
      return {
        ...state,
        session,
        attempts,
        currentQuestion: nextQuestion,
        currentQuestionIndex: state.currentQuestionIndex + 1,
      };
    }
    case 'endSession':
      return {
        ...state,
        status: 'complete',
        session: { ...state.session, completedAt: action.completedAt },
      };
  }
}

export interface PracticeSessionCallbacks {
  /** Called after each counted answer, with the session's updated totals (for saving). */
  onAttemptRecorded?: (attempt: PracticeAttempt, session: PracticeSession) => void;
  /** Called when the student ends a continuous session. */
  onSessionEnded?: (session: PracticeSession) => void;
}

/**
 * Runs one practice session. Question generation and timestamps happen here
 * (outside the reducer, which stays pure and easy to test).
 */
export function usePracticeSession(
  config: SessionConfig,
  { onAttemptRecorded, onSessionEnded }: PracticeSessionCallbacks = {},
) {
  const [state, dispatch] = useReducer(practiceSessionReducer, config, (c) =>
    createInitialState(
      c,
      generateQuestionForOperations(c.operations, c.difficulty),
      new Date().toISOString(),
    ),
  );

  const recordResult = useCallback(
    (selectedAnswer: number, selfReportedCorrect: boolean) => {
      if (state.status !== 'active') return;
      const question = state.currentQuestion;
      const attempt = createAttempt(
        question,
        selectedAnswer,
        selfReportedCorrect,
        state.session.id,
        new Date().toISOString(),
      );
      // Stop generating questions once the session is complete (TODO task 32).
      const finishes = hasReachedLength({
        sessionLength: state.session.sessionLength,
        attempted: state.session.attempted + 1,
      });
      const nextQuestion = finishes
        ? null
        : generateQuestionForOperations(config.operations, config.difficulty, { avoid: question });
      const action: PracticeSessionAction = { type: 'recordAttempt', attempt, nextQuestion };

      // The reducer is pure, so we can compute the result here to know whether it counted.
      const next = practiceSessionReducer(state, action);
      if (next === state) return;
      dispatch(action);
      onAttemptRecorded?.(attempt, next.session);
    },
    [state, config, onAttemptRecorded],
  );

  const endSession = useCallback(() => {
    const action: PracticeSessionAction = {
      type: 'endSession',
      completedAt: new Date().toISOString(),
    };
    const next = practiceSessionReducer(state, action);
    if (next === state) return;
    dispatch(action);
    onSessionEnded?.(next.session);
  }, [state, onSessionEnded]);

  return { state, recordResult, endSession };
}
