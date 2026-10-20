import { screen } from '@testing-library/react';
import { SCHEMA_VERSION, STORAGE_KEYS } from '../services/storageService';
import { answerQuestion, startSession } from '../test/practiceHelpers';
import { renderApp } from '../test/renderApp';
import { isSamePattern } from '../services/mistakeService';
import type { MistakePattern, PracticeAttempt, PracticeSession } from '../types';

const stored = <T,>(key: string): T => JSON.parse(localStorage.getItem(key) ?? 'null') as T;

describe('persistence through the real UI', () => {
  it('saves each answer to localStorage as soon as it is reported', async () => {
    const { user } = await startSession({ operations: [/multiplication/i], level: /easy/i });
    await answerQuestion(user, false, 2);

    const attempts = stored<PracticeAttempt[]>(STORAGE_KEYS.attempts);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      operation: 'multiplication',
      difficulty: 2,
      selfReportedCorrect: false,
      source: 'regular',
    });
    const sessions = stored<PracticeSession[]>(STORAGE_KEYS.sessions);
    expect(sessions[0]).toMatchObject({ attempted: 1, correct: 0, incorrect: 1 });
    expect(sessions[0].completedAt).toBeUndefined();
    expect(stored(STORAGE_KEYS.version)).toEqual({ version: SCHEMA_VERSION });
  });

  it('saves the completed session and keeps everything after a "browser restart"', async () => {
    const first = await startSession();
    for (const correct of [true, true, false, true, true])
      await answerQuestion(first.user, correct);
    first.unmount();

    const sessions = stored<PracticeSession[]>(STORAGE_KEYS.sessions);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ attempted: 5, correct: 4, incorrect: 1 });
    expect(typeof sessions[0].completedAt).toBe('string');
    expect(stored<PracticeAttempt[]>(STORAGE_KEYS.attempts)).toHaveLength(5);

    // A second session in a "new browser visit" adds to the saved history.
    const second = await startSession();
    for (let i = 0; i < 5; i++) await answerQuestion(second.user, false);
    expect(stored<PracticeAttempt[]>(STORAGE_KEYS.attempts)).toHaveLength(10);
    expect(stored(STORAGE_KEYS.statistics)).toMatchObject({
      attempted: 10,
      correct: 4,
      incorrect: 6,
    });
  });

  it('saves the totals of a continuous session when it is ended', async () => {
    const { user } = await startSession({ length: /keep going/i });
    await answerQuestion(user, true);
    await user.click(screen.getByRole('button', { name: /end session/i }));
    await user.click(screen.getAllByRole('button', { name: /end session/i }).at(-1)!);
    const [session] = stored<PracticeSession[]>(STORAGE_KEYS.sessions);
    expect(session).toMatchObject({ attempted: 1, sessionLength: 'continuous' });
    expect(typeof session.completedAt).toBe('string');
  });

  it('shows a friendly warning, and still lets the student practice, if saving fails', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { user } = await startSession();
    setItem.mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    await answerQuestion(user, true);
    expect(screen.getByRole('status')).toHaveTextContent(/could not save your latest progress/i);
    expect(screen.getByRole('button', { name: /^Answer 1:/ })).toBeInTheDocument();
    setItem.mockRestore();
  });

  it('starts cleanly when stored data is corrupted', () => {
    localStorage.setItem(STORAGE_KEYS.attempts, '{{ not json');
    localStorage.setItem(STORAGE_KEYS.settings, '"surprise"');
    renderApp('/');
    expect(
      screen.getByRole('heading', { level: 1, name: /let's practice math/i }),
    ).toBeInTheDocument();
  });
});

describe('mistake tracking through the real UI', () => {
  it('remembers questions marked wrong, once per fact, and keeps them after a restart', async () => {
    const first = await startSession();
    await answerQuestion(first.user, false);
    await answerQuestion(first.user, true);
    await answerQuestion(first.user, false);
    first.unmount();

    const patterns = stored<MistakePattern[]>(STORAGE_KEYS.mistakePatterns);
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(patterns.length).toBeLessThanOrEqual(2); // two wrong answers; the same fact twice => 1
    expect(patterns.reduce((sum, p) => sum + p.incorrectCount, 0)).toBe(2);
    expect(patterns.every((p) => p.operation === 'addition')).toBe(true);

    // Every fact marked wrong has a pattern.
    const wrongAttempts = stored<PracticeAttempt[]>(STORAGE_KEYS.attempts).filter(
      (a) => !a.selfReportedCorrect,
    );
    for (const a of wrongAttempts) {
      expect(patterns.some((p) => isSamePattern(p, a))).toBe(true);
    }
  });
});
