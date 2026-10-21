import {
  createInitialState,
  createAttempt,
  practiceSessionReducer,
} from '../hooks/usePracticeSession';
import type { Question, SessionConfig } from '../types';
import {
  ACTIVE_SESSION_KEY,
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
  type ActiveSessionSnapshot,
} from './activeSessionService';

const config: SessionConfig = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
  reviewMode: 'regular',
};

const question = (id: string): Question => ({
  id,
  operation: 'addition',
  firstOperand: 2,
  secondOperand: 3,
  displayText: '2 + 3',
  correctAnswer: 5,
  choices: [4, 5, 6, 7],
  difficulty: 1,
  source: 'regular',
});

/** A session one answer in, waiting on question q2 with 6 selected. */
function snapshot(): Omit<ActiveSessionSnapshot, 'version'> {
  const start = createInitialState(config, question('q1'), '2026-10-20T10:00:00.000Z');
  const attempt = createAttempt(start.currentQuestion, 5, true, start.session.id, 'T1');
  const state = practiceSessionReducer(start, {
    type: 'recordAttempt',
    attempt,
    nextQuestion: question('q2'),
  });
  return {
    routeKey: 'visit-1',
    config,
    state,
    card: { questionId: 'q2', selectedAnswer: 6, flipped: false },
  };
}

describe('active session snapshot (task 74)', () => {
  it('saves and restores the session for the same visit', () => {
    const snap = snapshot();
    saveActiveSession(snap);
    expect(loadActiveSession('visit-1', config)).toEqual({ version: 1, ...snap });
  });

  it('ignores and removes a snapshot from a different visit or with other settings', () => {
    saveActiveSession(snapshot());
    expect(loadActiveSession('visit-2', config)).toBeNull();
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();

    saveActiveSession(snapshot());
    expect(loadActiveSession('visit-1', { ...config, difficulty: 2 })).toBeNull();
  });

  it.each<[string, (s: Omit<ActiveSessionSnapshot, 'version'>) => unknown]>([
    [
      'an answer that is not one of the choices',
      (s) => ({ ...s, card: { ...s.card, selectedAnswer: 99 } }),
    ],
    [
      'a flipped card with no answer',
      (s) => ({ ...s, card: { ...s.card, selectedAnswer: null, flipped: true } }),
    ],
    ['a card for another question', (s) => ({ ...s, card: { ...s.card, questionId: 'other' } })],
    [
      'counts that do not add up',
      (s) => ({ ...s, state: { ...s.state, currentQuestionIndex: 4 } }),
    ],
    ['a finished session', (s) => ({ ...s, state: { ...s.state, status: 'complete' } })],
    [
      'an invalid question',
      (s) => ({
        ...s,
        state: { ...s.state, currentQuestion: { ...s.state.currentQuestion, correctAnswer: 9 } },
      }),
    ],
  ])('rejects %s', (_label, corrupt) => {
    sessionStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({ version: 1, ...(corrupt(snapshot()) as object) }),
    );
    expect(loadActiveSession('visit-1', config)).toBeNull();
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });

  it('survives unparseable data', () => {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, '{oops');
    expect(loadActiveSession('visit-1', config)).toBeNull();
  });

  it('does not throw when sessionStorage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => saveActiveSession(snapshot())).not.toThrow();
    spy.mockRestore();
    expect(() => clearActiveSession()).not.toThrow();
  });
});
