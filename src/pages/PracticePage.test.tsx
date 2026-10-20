import { screen, within } from '@testing-library/react';
import { answerQuestion, startSession, VISIBLE } from '../test/practiceHelpers';

const progress = () => screen.getByRole('progressbar', { name: /session progress/i });
const tally = () => screen.getByRole('list', { name: /score so far/i });

describe('practice session: questions and cards', () => {
  it('shows a generated question with four unique choices', async () => {
    await startSession({ operations: [/division/i], level: /advanced/i });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^\d+ ÷ \d+ = \?$/);
    const choices = within(screen.getByRole('group', { name: /answer choices/i })).getAllByRole(
      'button',
    );
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((c) => c.textContent)).size).toBe(4);
  });

  it('reveals the arithmetically correct answer on the back of the card', async () => {
    const { user } = await startSession({ operations: [/subtraction/i], level: /easy/i });
    const text = screen.getByRole('heading', { level: 2 }).textContent ?? '';
    const [, a, b] = text.match(/^(\d+) − (\d+)/) ?? [];
    await user.click(screen.getByRole('button', { name: /^Answer 1:/ }));
    await user.click(screen.getByRole('button', { name: /flip card/i }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`= ${+a - +b}`);
  });

  it('moves to a fresh card (no answer selected, focus on the question) after each result', async () => {
    const { user } = await startSession({ length: /^10 questions/i });
    expect(screen.getByText('Question 1 of 10', VISIBLE)).toBeInTheDocument();
    await answerQuestion(user, true, 2);
    expect(screen.getByText('Question 2 of 10', VISIBLE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /flip card/i })).toBeDisabled();
    const pressed = screen
      .getAllByRole('button', { name: /^Answer/ })
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });
});

describe('practice session: progress and tracking', () => {
  it('updates the progress bar and score after every attempt', async () => {
    const { user } = await startSession({ length: /^10 questions/i });
    expect(progress()).toHaveAttribute('aria-valuenow', '0');
    expect(progress()).toHaveAttribute('aria-valuemax', '10');

    await answerQuestion(user, true);
    await answerQuestion(user, false);
    await answerQuestion(user, true);

    expect(progress()).toHaveAttribute('aria-valuenow', '3');
    expect(progress()).toHaveAccessibleName(/session progress/i);
    expect(progress()).toHaveAttribute('aria-valuetext', '3 of 10 questions answered');
    expect(within(tally()).getByText(/right: 2/i)).toBeInTheDocument();
    expect(within(tally()).getByText(/to practice: 1/i)).toBeInTheDocument();
    expect(screen.getByText('Question 4 of 10', VISIBLE)).toBeInTheDocument();
  });

  it('shows encouraging feedback after each answer', async () => {
    const { user } = await startSession();
    await answerQuestion(user, false);
    expect(screen.getByText(/keep practicing|improving|good try|nice effort/i)).toBeInTheDocument();
  });

  it('ends a fixed-length session after the last question', async () => {
    const { user } = await startSession({ length: /^5 questions/i });
    for (let i = 0; i < 5; i++) await answerQuestion(user, i < 3);
    expect(screen.queryByRole('button', { name: /flip card/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/session/i);
  });
});

describe('practice session: continuous practice', () => {
  it('hides the fixed progress bar and keeps going past 20 questions', async () => {
    const { user } = await startSession({ length: /keep going/i });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Question 1', VISIBLE)).toBeInTheDocument();
    for (let i = 0; i < 21; i++) await answerQuestion(user, true);
    expect(screen.getByText('Question 22', VISIBLE)).toBeInTheDocument();
  }, 20000);

  it('asks before ending, and can carry on practicing', async () => {
    const { user } = await startSession({ length: /keep going/i });
    await answerQuestion(user, true);
    await user.click(screen.getByRole('button', { name: /end session/i }));
    const dialog = screen.getByRole('dialog', { name: /end this session/i });
    expect(dialog).toHaveTextContent(/you answered 1 question\./i);
    await user.click(within(dialog).getByRole('button', { name: /keep practicing/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Question 2', VISIBLE)).toBeInTheDocument();
  });

  it('ends the session after confirming', async () => {
    const { user } = await startSession({ length: /keep going/i });
    await answerQuestion(user, true);
    await answerQuestion(user, false);
    await user.click(screen.getByRole('button', { name: /end session/i }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /end session/i }),
    );
    expect(screen.queryByRole('button', { name: /flip card/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/session/i);
  });

  it('goes straight back to setup (keeping the choices) if nothing was answered', async () => {
    const { user } = await startSession({
      operations: [/multiplication/i],
      level: /advanced/i,
      length: /keep going/i,
    });
    await user.click(screen.getByRole('button', { name: /end session/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /get ready/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /multiplication/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('radio', { name: /advanced/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /keep going/i })).toBeChecked();
  });
});
