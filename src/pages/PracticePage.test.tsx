import { screen, within } from '@testing-library/react';
import { renderApp } from '../test/renderApp';

// The hidden card face is aria-hidden; ignore its text when matching.
const VISIBLE = { ignore: '[aria-hidden="true"] *' };

async function startSession(operation: RegExp, level: RegExp) {
  const result = renderApp('/practice/setup');
  const { user } = result;
  const ops = screen.getByRole('group', { name: /pick your math/i });
  await user.click(within(ops).getByRole('button', { name: /addition/i })); // turn off the default
  await user.click(within(ops).getByRole('button', { name: operation }));
  await user.click(screen.getByRole('radio', { name: level }));
  await user.click(screen.getByRole('button', { name: /start session/i }));
  return result;
}

describe('practice page with question card', () => {
  it('shows a generated question with four unique choices', async () => {
    await startSession(/division/i, /advanced/i);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^\d+ ÷ \d+ = \?$/);
    const choices = within(screen.getByRole('group', { name: /answer choices/i })).getAllByRole(
      'button',
    );
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((c) => c.textContent)).size).toBe(4);
  });

  it('reveals the arithmetically correct answer on the back of the card', async () => {
    const { user } = await startSession(/subtraction/i, /easy/i);
    const text = screen.getByRole('heading', { level: 2 }).textContent ?? '';
    const [, a, b] = text.match(/^(\d+) − (\d+)/) ?? [];
    await user.click(screen.getByRole('button', { name: /^Answer 1:/ }));
    await user.click(screen.getByRole('button', { name: /flip card/i }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`= ${+a - +b}`);
  });

  it('moves to a new card after the student reports a result', async () => {
    const { user } = await startSession(/addition/i, /advanced/i);
    expect(screen.getByText('Question 1 of 10', VISIBLE)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Answer 2:/ }));
    await user.click(screen.getByRole('button', { name: /flip card/i }));
    await user.click(screen.getByRole('button', { name: /i got it right/i }));
    expect(screen.getByText('Question 2 of 10', VISIBLE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /flip card/i })).toBeDisabled();
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });
});
