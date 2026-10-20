import { screen, within } from '@testing-library/react';
import { createAppStore } from '../app/appStore';
import { STORAGE_KEYS } from '../services/storageService';
import { makeAttempt, makeSession } from '../test/fixtures';
import { answerQuestion, startSession } from '../test/practiceHelpers';
import { renderApp } from '../test/renderApp';
import type { PracticeAttempt, PracticeSession } from '../types';

/** Save practice history into localStorage the way the app does, then open /statistics. */
function seed(entries: { attempt: Partial<PracticeAttempt>; session: PracticeSession }[]) {
  const store = createAppStore();
  for (const { attempt, session } of entries) {
    store.recordAttempt(makeAttempt({ sessionId: session.id, ...attempt }), session);
  }
}

const tileValue = (scope: HTMLElement, label: RegExp) =>
  within(scope).getByText(label).closest('div')?.querySelector('dd')?.textContent;

function seedTypicalHistory() {
  const yesterday = makeSession({
    operations: ['addition', 'multiplication'],
    difficulty: 2,
    attempted: 3,
    correct: 2,
    incorrect: 1,
    completedAt: '2026-10-19T15:00:00.000Z',
  });
  const today = makeSession({
    operations: ['division'],
    difficulty: 3,
    attempted: 1,
    correct: 0,
    incorrect: 1,
    completedAt: '2026-10-20T15:00:00.000Z',
  });
  seed([
    { attempt: { operation: 'addition', difficulty: 2 }, session: yesterday },
    { attempt: { operation: 'multiplication', difficulty: 2 }, session: yesterday },
    {
      attempt: { operation: 'multiplication', difficulty: 2, selfReportedCorrect: false },
      session: yesterday,
    },
    {
      attempt: { operation: 'division', difficulty: 3, selfReportedCorrect: false },
      session: today,
    },
  ]);
  return { yesterday, today };
}

describe('statistics page', () => {
  it('shows a friendly empty state for new users, without a reset button', () => {
    renderApp('/statistics');
    expect(screen.getByText(/no practice yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start practice/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset statistics/i })).not.toBeInTheDocument();
  });

  it('shows overall totals and accuracy', () => {
    seedTypicalHistory();
    renderApp('/statistics');
    const overall = screen.getByLabelText('Overall results');
    expect(tileValue(overall, /^questions$/i)).toBe('4');
    expect(tileValue(overall, /\bcorrect$/i)).toBe('2');
    expect(tileValue(overall, /incorrect/i)).toBe('2');
    expect(tileValue(overall, /accuracy/i)).toBe('50%');
  });

  it('shows one card per operation with its own totals and accuracy', () => {
    seedTypicalHistory();
    renderApp('/statistics');
    const section = screen.getByRole('region', { name: /by operation/i });
    const multiplication = within(section).getByRole('article', { name: 'Multiplication' });
    expect(tileValue(multiplication, /attempted/i)).toBe('2');
    expect(tileValue(multiplication, /^correct$/i)).toBe('1');
    expect(tileValue(multiplication, /incorrect/i)).toBe('1');
    expect(multiplication).toHaveTextContent('50% accuracy');
    expect(within(section).getByRole('article', { name: 'Addition' })).toHaveTextContent(
      '100% accuracy',
    );
    expect(within(section).getByRole('article', { name: 'Subtraction' })).toHaveTextContent(
      /not practiced yet/i,
    );
    expect(within(section).getAllByRole('article')).toHaveLength(4);
  });

  it('shows one clearly labelled card per difficulty level', () => {
    seedTypicalHistory();
    renderApp('/statistics');
    const section = screen.getByRole('region', { name: /by level/i });
    expect(within(section).getAllByRole('article')).toHaveLength(4);
    const easy = within(section).getByRole('article', { name: 'Level 2 · Easy' });
    expect(tileValue(easy, /attempted/i)).toBe('3');
    expect(easy).toHaveTextContent('67% accuracy');
    expect(
      within(section).getByRole('article', { name: 'Level 3 · Intermediate' }),
    ).toHaveTextContent('0% accuracy');
  });

  it('lists recent sessions newest first with all the spec columns', () => {
    seedTypicalHistory();
    renderApp('/statistics');
    const table = screen.getByRole('table', { name: /recent practice sessions/i });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual([
      'Date',
      'Practiced',
      'Level',
      'Questions',
      'Correct',
      'Incorrect',
      'Accuracy',
    ]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/Oct 20.*Division.*3 · Intermediate.*1.*0.*1.*0%/);
    expect(rows[1]).toHaveTextContent(
      /Oct 19.*Addition and Multiplication.*2 · Easy.*3.*2.*1.*67%/,
    );
  });

  it('marks unfinished sessions', () => {
    const session = makeSession({ attempted: 1, correct: 1, incorrect: 0, completedAt: undefined });
    seed([{ attempt: {}, session }]);
    renderApp('/statistics');
    expect(screen.getByText(/not finished/i)).toBeInTheDocument();
  });

  it('reflects a session just completed in the app', async () => {
    const { user } = await startSession({ operations: [/subtraction/i] });
    for (const correct of [true, false, true, true, true]) await answerQuestion(user, correct);
    await user.click(screen.getByRole('link', { name: /view statistics/i }));
    const overall = screen.getByLabelText('Overall results');
    expect(tileValue(overall, /^questions$/i)).toBe('5');
    expect(tileValue(overall, /accuracy/i)).toBe('80%');
    const subtraction = screen.getByRole('article', { name: 'Subtraction' });
    expect(tileValue(subtraction, /attempted/i)).toBe('5');
  });
});

describe('reset statistics', () => {
  it('asks with the exact spec wording and does nothing if cancelled', async () => {
    seedTypicalHistory();
    const { user } = renderApp('/statistics');
    await user.click(screen.getByRole('button', { name: /reset statistics/i }));
    const dialog = screen.getByRole('dialog', { name: /reset statistics/i });
    expect(dialog).toHaveTextContent(
      'Are you sure you want to erase all practice history and statistics?',
    );
    await user.click(within(dialog).getByRole('button', { name: /keep my statistics/i }));
    expect(screen.getByLabelText('Overall results')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.attempts)).not.toBeNull();
  });

  it('erases history and statistics after confirming, keeps settings, and stays erased', async () => {
    seedTypicalHistory();
    createAppStore().updateSettings({ soundEffects: true });
    const { user, unmount } = renderApp('/statistics');
    await user.click(screen.getByRole('button', { name: /reset statistics/i }));
    await user.click(screen.getByRole('button', { name: /yes, erase it/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/have been erased/i);
    expect(screen.getByText(/no practice yet/i)).toBeInTheDocument();
    for (const key of ['attempts', 'sessions', 'statistics'] as const) {
      expect(localStorage.getItem(STORAGE_KEYS[key])).toBeNull();
    }
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!).soundEffects).toBe(true);

    unmount();
    renderApp('/statistics');
    expect(screen.getByText(/no practice yet/i)).toBeInTheDocument();
  });
});
