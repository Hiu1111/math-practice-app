import type { Question, SessionConfig, SessionLength } from '../types';
import {
  createAttempt,
  createInitialState,
  hasReachedLength,
  practiceSessionReducer,
  type PracticeSessionState,
} from './usePracticeSession';

let counter = 0;
function makeQuestion(overrides: Partial<Question> = {}): Question {
  counter += 1;
  return {
    id: `q${counter}`,
    operation: 'addition',
    firstOperand: 2,
    secondOperand: 3,
    displayText: '2 + 3',
    correctAnswer: 5,
    choices: [4, 5, 6, 7],
    difficulty: 1,
    source: 'regular',
    ...overrides,
  };
}

const config = (sessionLength: SessionLength): SessionConfig => ({
  operations: ['addition', 'division'],
  difficulty: 1,
  sessionLength,
  reviewMode: 'regular',
});

function start(sessionLength: SessionLength) {
  return createInitialState(config(sessionLength), makeQuestion(), '2026-10-20T10:00:00.000Z');
}

/** Answer the current question and move to a new one. */
function answer(state: PracticeSessionState, correct: boolean, selected = 5, at = 'T') {
  const attempt = createAttempt(state.currentQuestion, selected, correct, state.session.id, at);
  return practiceSessionReducer(state, {
    type: 'recordAttempt',
    attempt,
    nextQuestion: makeQuestion(),
  });
}

describe('initial session state', () => {
  it('stores the session id, operations, difficulty, length and an active status', () => {
    const state = start(10);
    expect(state.session.id).toMatch(/^session_/);
    expect(state.session.operations).toEqual(['addition', 'division']);
    expect(state.session.difficulty).toBe(1);
    expect(state.session.sessionLength).toBe(10);
    expect(state.session.startedAt).toBe('2026-10-20T10:00:00.000Z');
    expect(state.status).toBe('active');
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.session).toMatchObject({ attempted: 0, correct: 0, incorrect: 0 });
  });
});

describe('recording self-reported results', () => {
  it('counts right and wrong answers and moves to the next question', () => {
    let state = start(10);
    const first = state.currentQuestion;
    state = answer(state, true);
    state = answer(state, false, 4);
    state = answer(state, true);
    expect(state.session).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 });
    expect(state.currentQuestionIndex).toBe(3);
    expect(state.currentQuestion.id).not.toBe(first.id);
    expect(state.attempts).toHaveLength(3);
  });

  it('stores a complete attempt record (spec 10.1)', () => {
    const state = answer(start(5), false, 6, '2026-10-20T10:01:00.000Z');
    expect(state.attempts[0]).toMatchObject({
      operation: 'addition',
      firstOperand: 2,
      secondOperand: 3,
      correctAnswer: 5,
      selectedAnswer: 6,
      selfReportedCorrect: false,
      difficulty: 1,
      source: 'regular',
      attemptedAt: '2026-10-20T10:01:00.000Z',
      sessionId: state.session.id,
    });
  });

  it('counts each question exactly once, even if the same result is sent twice', () => {
    const state = start(10);
    const attempt = createAttempt(state.currentQuestion, 5, true, state.session.id, 'T');
    const once = practiceSessionReducer(state, {
      type: 'recordAttempt',
      attempt,
      nextQuestion: makeQuestion(),
    });
    // A second, duplicate dispatch for the same question (e.g. a double click).
    const twice = practiceSessionReducer(once, {
      type: 'recordAttempt',
      attempt: { ...attempt, id: 'other' },
      nextQuestion: makeQuestion(),
    });
    expect(twice.session.attempted).toBe(1);
    expect(twice).toBe(once);
  });

  it('does not count a question twice even if the same question comes back as the next one', () => {
    const state = start(10);
    const question = state.currentQuestion;
    const attempt = () => createAttempt(question, 5, true, state.session.id, 'T');
    // Simulate a generator bug that hands back the question that was just answered.
    const once = practiceSessionReducer(state, {
      type: 'recordAttempt',
      attempt: attempt(),
      nextQuestion: question,
    });
    const twice = practiceSessionReducer(once, {
      type: 'recordAttempt',
      attempt: attempt(),
      nextQuestion: question,
    });
    expect(once.session.attempted).toBe(1);
    expect(twice.session.attempted).toBe(1);
  });

  it('ignores an attempt for a question that is not the current one', () => {
    const state = start(10);
    const stale = createAttempt(makeQuestion(), 5, true, state.session.id, 'T');
    expect(
      practiceSessionReducer(state, { type: 'recordAttempt', attempt: stale, nextQuestion: null }),
    ).toBe(state);
  });

  it('ignores an attempt whose answer is not one of the choices', () => {
    const state = start(10);
    const bogus = createAttempt(state.currentQuestion, 99, true, state.session.id, 'T');
    expect(
      practiceSessionReducer(state, { type: 'recordAttempt', attempt: bogus, nextQuestion: null }),
    ).toBe(state);
  });

  it('counts mistake-review questions separately', () => {
    const state = createInitialState(
      config(5),
      makeQuestion({ source: 'mistake-review', mistakePatternId: 'm1' }),
      'T',
    );
    const next = answer(state, true);
    expect(next.session.reviewQuestionsCompleted).toBe(1);
    expect(next.attempts[0].mistakePatternId).toBe('m1');
  });
});

describe('session completion', () => {
  it('completes a fixed-length session after the last question, with a timestamp', () => {
    let state = start(5);
    for (let i = 0; i < 4; i++) state = answer(state, true);
    expect(state.status).toBe('active');
    state = answer(state, false, 4, '2026-10-20T10:05:00.000Z');
    expect(state.status).toBe('complete');
    expect(state.session).toMatchObject({ attempted: 5, correct: 4, incorrect: 1 });
    expect(state.session.completedAt).toBe('2026-10-20T10:05:00.000Z');
  });

  it('records nothing more once complete', () => {
    let state = start(5);
    for (let i = 0; i < 5; i++) state = answer(state, true);
    expect(answer(state, true)).toBe(state);
  });

  it('never completes a continuous session on its own', () => {
    let state = start('continuous');
    for (let i = 0; i < 50; i++) state = answer(state, i % 2 === 0);
    expect(state.status).toBe('active');
    expect(state.session.attempted).toBe(50);
  });

  it('ends a continuous session when asked, keeping the totals', () => {
    let state = answer(answer(start('continuous'), true), false, 4);
    state = practiceSessionReducer(state, { type: 'endSession', completedAt: 'END' });
    expect(state.status).toBe('complete');
    expect(state.session).toMatchObject({ attempted: 2, correct: 1, incorrect: 1 });
    expect(state.session.completedAt).toBe('END');
  });

  it('knows when a fixed length has been reached', () => {
    expect(hasReachedLength({ sessionLength: 5, attempted: 5 })).toBe(true);
    expect(hasReachedLength({ sessionLength: 5, attempted: 4 })).toBe(false);
    expect(hasReachedLength({ sessionLength: 'continuous', attempted: 999 })).toBe(false);
  });
});
