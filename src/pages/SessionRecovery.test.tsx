import { screen, within } from '@testing-library/react';
import { createAppStore } from '../app/appStore';
import { ACTIVE_SESSION_KEY } from '../services/activeSessionService';
import { STORAGE_KEYS } from '../services/storageService';
import { answerButton, answerQuestion, VISIBLE } from '../test/practiceHelpers';
import { renderApp } from '../test/renderApp';
import type { PracticeAttempt, PracticeSession, SessionConfig } from '../types';

const config: SessionConfig = {
  operations: ['multiplication'],
  difficulty: 2,
  sessionLength: 5,
  reviewMode: 'regular',
};

/** The session page as the browser would restore it after a refresh: same state, same key. */
const visit = (key = 'visit-1') => ({ pathname: '/practice/session', state: { config }, key });

const stored = <T,>(key: string): T => JSON.parse(localStorage.getItem(key) ?? 'null') as T;

describe('session recovery after a refresh (task 74)', () => {
  it('comes back to the same question with the same selected answer', async () => {
    const first = renderApp(visit());
    await answerQuestion(first.user, true);
    await answerQuestion(first.user, false);
    const question3 = screen.getByRole('heading', { level: 2 }).textContent;
    await first.user.click(answerButton(3));
    const chosen = answerButton(3).textContent;
    first.unmount(); // "refresh"

    renderApp(visit());
    expect(screen.getByRole('status')).toHaveTextContent(/welcome back! you are on question 3/i);
    expect(screen.getByText('Question 3 of 5', VISIBLE)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(question3!);
    expect(answerButton(3)).toHaveAttribute('aria-pressed', 'true');
    expect(answerButton(3).textContent).toBe(chosen);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    const tally = screen.getByRole('list', { name: /score so far/i });
    expect(within(tally).getByText(/right: 1/i)).toBeInTheDocument();
    expect(within(tally).getByText(/to practice: 1/i)).toBeInTheDocument();
  });

  it('comes back to a flipped card and counts each answer exactly once', async () => {
    const first = renderApp(visit());
    await answerQuestion(first.user, true);
    await first.user.click(answerButton(1));
    await first.user.click(screen.getByRole('button', { name: /flip card/i }));
    first.unmount();

    const second = renderApp(visit());
    expect(screen.getByRole('button', { name: /i got it right/i })).toBeEnabled();
    await second.user.click(screen.getByRole('button', { name: /i got it right/i }));
    expect(screen.getByText('Question 3 of 5', VISIBLE)).toBeInTheDocument();
    for (let i = 0; i < 3; i++) await answerQuestion(second.user, true);

    expect(
      screen.getByRole('heading', { level: 1, name: /session complete/i }),
    ).toBeInTheDocument();
    const attempts = stored<PracticeAttempt[]>(STORAGE_KEYS.attempts);
    expect(attempts).toHaveLength(5);
    expect(new Set(attempts.map((a) => a.questionId)).size).toBe(5);
    expect(stored<PracticeSession[]>(STORAGE_KEYS.sessions)).toHaveLength(1);
  });

  it('starts fresh on a new visit, and forgets the saved session when it completes', async () => {
    const first = renderApp(visit('visit-1'));
    await answerQuestion(first.user, true);
    first.unmount();

    const other = renderApp(visit('visit-2')); // e.g. Practice Again: a new navigation
    expect(screen.queryByText(/welcome back/i)).not.toBeInTheDocument();
    expect(screen.getByText('Question 1 of 5', VISIBLE)).toBeInTheDocument();
    for (let i = 0; i < 5; i++) await answerQuestion(other.user, true);
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });

  it('Clear All Application Data also forgets a session in progress', async () => {
    const first = renderApp(visit());
    await answerQuestion(first.user, true);
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).not.toBeNull();
    first.unmount();
    createAppStore().clearAllData();
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });
});

describe('protecting an active session (task 75)', () => {
  it('asks before leaving through the navigation, and can keep practicing', async () => {
    const { user } = renderApp(visit());
    await answerQuestion(user, true);
    const nav = screen.getByRole('navigation', { name: /main/i });
    await user.click(within(nav).getByRole('link', { name: /statistics/i }));

    const dialog = screen.getByRole('dialog', { name: /leave this session/i });
    expect(dialog).toHaveTextContent(/you answered 1 question\. your answers so far are saved/i);
    await user.click(within(dialog).getByRole('button', { name: /keep practicing/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Question 2 of 5', VISIBLE)).toBeInTheDocument();
  });

  it('ends the session properly and leaves when confirmed', async () => {
    const { user } = renderApp(visit());
    await answerQuestion(user, true);
    await answerQuestion(user, false);
    await user.click(
      within(screen.getByRole('navigation', { name: /main/i })).getByRole('link', {
        name: /statistics/i,
      }),
    );
    await user.click(screen.getByRole('button', { name: /leave session/i }));

    expect(screen.getByRole('heading', { level: 1, name: /statistics/i })).toBeInTheDocument();
    const [session] = stored<PracticeSession[]>(STORAGE_KEYS.sessions);
    expect(session).toMatchObject({ attempted: 2, correct: 1, incorrect: 1 });
    expect(typeof session.completedAt).toBe('string');
    expect(sessionStorage.getItem(ACTIVE_SESSION_KEY)).toBeNull();
  });

  it('does not ask when nothing has been answered yet', async () => {
    const { user } = renderApp(visit());
    await user.click(
      within(screen.getByRole('navigation', { name: /main/i })).getByRole('link', {
        name: /home/i,
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /let's practice math/i }),
    ).toBeInTheDocument();
  });

  it('does not ask after the session is complete', async () => {
    const { user } = renderApp(visit());
    for (let i = 0; i < 5; i++) await answerQuestion(user, true);
    expect(
      screen.getByRole('heading', { level: 1, name: /session complete/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /return home/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks the browser to confirm closing the tab only while answers are in progress', async () => {
    const { user, unmount } = renderApp(visit());
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);
    await answerQuestion(user, true);
    expect(unload()).toBe(true);
    for (let i = 0; i < 4; i++) await answerQuestion(user, true);
    expect(unload()).toBe(false); // complete: no warning
    unmount();
  });
});
