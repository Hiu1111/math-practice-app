import { screen, within } from '@testing-library/react';
import { answerQuestion, startSession, VISIBLE } from '../test/practiceHelpers';
import { renderApp } from '../test/renderApp';

/** The number shown for a result tile such as "Correct". */
function statValue(label: RegExp) {
  const results = screen.getByLabelText('Results');
  const term = within(results).getByText(label);
  return term.closest('.stat-tile')?.querySelector('dd')?.textContent;
}

async function finishSession(results: boolean[], options = {}) {
  const rendered = await startSession(options);
  for (const correct of results) await answerQuestion(rendered.user, correct);
  return rendered;
}

describe('session summary', () => {
  it('shows totals and accuracy after a fixed-length session', async () => {
    await finishSession([true, true, false, true, false], {
      operations: [/addition/i, /division/i],
      level: /intermediate/i,
    });
    expect(
      screen.getByRole('heading', { level: 1, name: /session complete/i }),
    ).toBeInTheDocument();
    expect(statValue(/^questions$/i)).toBe('5');
    expect(statValue(/\bcorrect$/i)).toBe('3');
    expect(statValue(/incorrect/i)).toBe('2');
    expect(statValue(/accuracy/i)).toBe('60%');

    const details = screen.getByLabelText('Session details');
    expect(within(details).getByText('Addition and Division')).toBeInTheDocument();
    expect(within(details).getByText(/level 3 · intermediate/i)).toBeInTheDocument();
    expect(within(details).getByText(/mistake-review questions/i)).toBeInTheDocument();
  });

  it('celebrates a perfect score and moves focus to the result', async () => {
    await finishSession([true, true, true, true, true]);
    const heading = screen.getByRole('heading', { level: 2, name: /perfect score/i });
    expect(heading).toHaveFocus();
    expect(statValue(/accuracy/i)).toBe('100%');
  });

  it('stays encouraging when every answer was wrong', async () => {
    await finishSession([false, false, false, false, false]);
    expect(statValue(/accuracy/i)).toBe('0%');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/keep practicing/i);
  });

  it('summarises a continuous session that was ended early', async () => {
    const { user } = await startSession({ length: /keep going/i });
    await answerQuestion(user, true);
    await answerQuestion(user, true);
    await answerQuestion(user, false);
    await user.click(screen.getByRole('button', { name: /end session/i }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /end session/i }),
    );
    expect(statValue(/^questions$/i)).toBe('3');
    expect(statValue(/accuracy/i)).toBe('67%');
  });

  it('offers all five actions from the spec', async () => {
    await finishSession([true, false, true, true, true]);
    expect(screen.getByRole('link', { name: /practice again/i })).toBeInTheDocument();
    // One wrong answer, so there is a mistake to practice.
    expect(screen.getByRole('link', { name: /practice mistakes/i })).toHaveAttribute(
      'href',
      '/practice/session',
    );
    expect(screen.getByText(/1 mistake ready to practice/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /change settings/i })).toHaveAttribute(
      'href',
      '/practice/setup',
    );
    expect(screen.getByRole('link', { name: /view statistics/i })).toHaveAttribute(
      'href',
      '/statistics',
    );
    expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/');
  });

  it('disables Practice Mistakes, and says why, when there are no mistakes', async () => {
    await finishSession([true, true, true, true, true]);
    expect(screen.getByRole('button', { name: /practice mistakes/i })).toBeDisabled();
    expect(screen.getByText(/no mistakes to practice/i)).toBeInTheDocument();
  });

  it('Practice Again starts a brand-new session with the same settings', async () => {
    const { user } = await finishSession([true, true, true, true, true], {
      operations: [/multiplication/i],
    });
    await user.click(screen.getByRole('link', { name: /practice again/i }));
    expect(screen.getByText('Question 1 of 5', VISIBLE)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('×');
  });

  it('Change Settings returns to setup with the previous choices selected', async () => {
    const { user } = await finishSession([true, true, true, true, true], {
      operations: [/subtraction/i],
      level: /easy/i,
    });
    await user.click(screen.getByRole('link', { name: /change settings/i }));
    expect(screen.getByRole('button', { name: /subtraction/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /addition/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('radio', { name: /easy/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^5 questions/i })).toBeChecked();
  });

  it('shows an empty state when opened without a finished session', () => {
    renderApp('/practice/summary');
    expect(screen.getByText(/no summary yet/i)).toBeInTheDocument();
  });
});
