import { screen, within } from '@testing-library/react';
import { createAppStore } from '../app/appStore';
import { STORAGE_KEYS } from '../services/storageService';
import { listSimilarCandidates } from '../services/similarQuestionGenerator';
import { makeAttempt } from '../test/fixtures';
import { answerQuestion, VISIBLE } from '../test/practiceHelpers';
import { renderApp } from '../test/renderApp';
import type { MistakePattern } from '../types';

const OP_SYMBOL = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };

/** Record a wrong answer for 8 × 7 at Level 2 the way the app does. */
function seedMistake(overrides = {}) {
  const store = createAppStore();
  const attempt = makeAttempt({
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 7,
    correctAnswer: 56,
    selectedAnswer: 54,
    selfReportedCorrect: false,
    difficulty: 2,
    ...overrides,
  });
  store.recordAttempt(attempt, {
    id: attempt.sessionId,
    startedAt: attempt.attemptedAt,
    completedAt: attempt.attemptedAt,
    operations: [attempt.operation],
    difficulty: attempt.difficulty,
    sessionLength: 5,
    reviewMode: 'regular',
    attempted: 1,
    correct: 0,
    incorrect: 1,
    reviewQuestionsCompleted: 0,
  });
  return store.getState().mistakePatterns[0];
}

const storedPatterns = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEYS.mistakePatterns) ?? '[]') as MistakePattern[];

async function chooseSetup(
  user: ReturnType<typeof renderApp>['user'],
  { op = /multiplication/i, level = /easy/i } = {},
) {
  const ops = screen.getByRole('group', { name: /pick your math/i });
  await user.click(within(ops).getByRole('button', { name: /addition/i }));
  await user.click(within(ops).getByRole('button', { name: op }));
  await user.click(screen.getByRole('radio', { name: level }));
}

describe('review mode on the setup page (task 58)', () => {
  it('offers regular practice by default and disables mistake review when there are no mistakes', () => {
    renderApp('/practice/setup');
    expect(screen.getByRole('radio', { name: /regular practice/i })).toBeChecked();
    const review = screen.getByRole('radio', { name: /practice my mistakes/i });
    expect(review).toBeDisabled();
    expect(review).toHaveAccessibleName(/no mistakes to practice yet/i);
  });

  it('shows how many mistakes match the chosen math and level', async () => {
    seedMistake();
    const { user } = renderApp('/practice/setup');
    // Default choices (Addition, Level 1) do not match the 8 × 7 Level 2 mistake.
    expect(screen.getByRole('radio', { name: /practice my mistakes/i })).toHaveAccessibleName(
      /you have 1 to practice with other choices/i,
    );
    await chooseSetup(user);
    const review = screen.getByRole('radio', { name: /practice my mistakes/i });
    expect(review).toBeEnabled();
    expect(review).toHaveAccessibleName(/1 mistake to practice for these choices/i);
  });

  it('will not start a review session when no mistakes match', async () => {
    seedMistake();
    const { user } = renderApp('/practice/setup');
    await chooseSetup(user);
    await user.click(screen.getByRole('radio', { name: /practice my mistakes/i }));
    await user.click(screen.getByRole('radio', { name: /advanced/i }));
    expect(screen.getByRole('button', { name: /start session/i })).toBeDisabled();
    expect(
      screen.getByText(/no mistakes to practice for this math and level/i),
    ).toBeInTheDocument();
  });
});

describe('mistake review sessions (tasks 60–62)', () => {
  it('asks similar questions, and ends once the mistake is mastered', async () => {
    const pattern = seedMistake();
    const allowed = listSimilarCandidates(pattern).map(
      (c) => `${c.firstOperand} ${OP_SYMBOL[c.operation]} ${c.secondOperand} = ?`,
    );
    const { user } = renderApp('/practice/setup');
    await chooseSetup(user);
    await user.click(screen.getByRole('radio', { name: /practice my mistakes/i }));
    await user.click(screen.getByRole('radio', { name: /^10 questions/i }));
    await user.click(screen.getByRole('button', { name: /start session/i }));

    expect(screen.getByText(/mistake practice/i)).toBeInTheDocument();
    for (let i = 0; i < 3; i++) {
      expect(allowed).toContain(screen.getByRole('heading', { level: 2 }).textContent);
      await answerQuestion(user, true);
    }

    // Three correct similar answers master the only mistake, so the session ends early.
    expect(
      screen.getByRole('heading', { level: 1, name: /session complete/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/you mastered every mistake/i)).toBeInTheDocument();
    const details = screen.getByLabelText('Session details');
    expect(within(details).getByText('Mistake practice')).toBeInTheDocument();
    expect(within(details).getByText(/mistake-review questions/i).nextSibling).toHaveTextContent(
      '3',
    );
    expect(storedPatterns()[0]).toMatchObject({ similarCorrectCount: 3, mastered: true });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.statistics)!).review).toEqual({
      attempted: 3,
      correct: 3,
      incorrect: 0,
    });
  });

  it('records which mistake each review question came from', async () => {
    const pattern = seedMistake();
    const { user } = renderApp('/practice/setup');
    await chooseSetup(user);
    await user.click(screen.getByRole('radio', { name: /practice my mistakes/i }));
    await user.click(screen.getByRole('button', { name: /start session/i }));
    await answerQuestion(user, false);
    const attempts = JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!);
    expect(attempts.at(-1)).toMatchObject({
      source: 'mistake-review',
      mistakePatternId: pattern.id,
    });
    // A wrong review answer counts as another miss; it does not create a new pattern.
    expect(storedPatterns()).toHaveLength(1);
    expect(storedPatterns()[0]).toMatchObject({ incorrectCount: 2, similarCorrectCount: 0 });
  });

  it('mixes several mistakes in one session', async () => {
    seedMistake();
    seedMistake({ firstOperand: 6, secondOperand: 9, correctAnswer: 54, selectedAnswer: 56 });
    seedMistake({ firstOperand: 4, secondOperand: 3, correctAnswer: 12, selectedAnswer: 7 });
    createAppStore().updateSettings({ masteryThreshold: 10 }); // keep them all active
    const { user } = renderApp('/practice/setup');
    await chooseSetup(user);
    await user.click(screen.getByRole('radio', { name: /practice my mistakes/i }));
    await user.click(screen.getByRole('button', { name: /start session/i }));
    for (let i = 0; i < 6; i++) await answerQuestion(user, true);
    const ids = new Set(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)!)
        .filter((a: { source: string }) => a.source === 'mistake-review')
        .map((a: { mistakePatternId: string }) => a.mistakePatternId),
    );
    expect(ids.size).toBeGreaterThanOrEqual(2);
  });

  it('a mastered mistake comes back after a new mistake on the same fact', () => {
    const pattern = seedMistake();
    const store = createAppStore();
    for (let i = 0; i < 3; i++) {
      store.recordAttempt(makeAttempt({ source: 'mistake-review', mistakePatternId: pattern.id }), {
        ...store.getState().sessions[0],
      });
    }
    expect(store.getState().mistakePatterns[0].mastered).toBe(true);
    seedMistake();
    expect(storedPatterns()[0]).toMatchObject({ mastered: false, incorrectCount: 2 });
  });
});

describe('Practice Mistakes from the summary', () => {
  it('starts a mistake review for the same math and level', async () => {
    const { user } = renderApp('/practice/setup');
    await chooseSetup(user, { op: /division/i, level: /intermediate/i });
    await user.click(screen.getByRole('radio', { name: /^5 questions/i }));
    await user.click(screen.getByRole('button', { name: /start session/i }));
    for (const correct of [false, true, true, true, true]) await answerQuestion(user, correct);

    await user.click(screen.getByRole('link', { name: /practice mistakes/i }));
    expect(screen.getByText(/mistake practice/i)).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5', VISIBLE)).toBeInTheDocument();
  });

  it('sends a review session with nothing left back to setup with a notice', async () => {
    const pattern = seedMistake();
    const store = createAppStore();
    store.updateSettings({ masteryThreshold: 1 });
    store.recordAttempt(
      makeAttempt({ source: 'mistake-review', mistakePatternId: pattern.id }),
      store.getState().sessions[0],
    );
    renderApp('/practice/setup');
    expect(screen.getByRole('radio', { name: /practice my mistakes/i })).toBeDisabled();
  });
});
