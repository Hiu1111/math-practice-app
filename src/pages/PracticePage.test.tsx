import { screen, within } from '@testing-library/react';
import { renderApp } from '../test/renderApp';

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

describe('practice page question preview', () => {
  it('shows a generated question with four unique choices', async () => {
    await startSession(/division/i, /advanced/i);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/^\d+ ÷ \d+ = \?$/);
    const choices = within(screen.getByRole('list', { name: /answer choices/i })).getAllByRole(
      'listitem',
    );
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((c) => c.textContent)).size).toBe(4);
  });

  it('gives the question a spoken label for screen readers', async () => {
    await startSession(/multiplication/i, /beginner/i);
    expect(screen.getByRole('heading', { level: 2 })).toHaveAccessibleName(
      /^What is \d+ times \d+\?$/,
    );
  });

  it('reveals the correct answer, which matches the arithmetic', async () => {
    const { user } = await startSession(/subtraction/i, /easy/i);
    const text = screen.getByRole('heading', { level: 2 }).textContent ?? '';
    const [, a, b] = text.match(/^(\d+) − (\d+)/) ?? [];
    await user.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText(/✓ answer/).parentElement).toHaveTextContent(String(+a - +b));
  });

  it('generates a new question on request', async () => {
    const { user } = await startSession(/addition/i, /advanced/i);
    const heading = screen.getByRole('heading', { level: 2 });
    const first = heading.textContent;
    await user.click(screen.getByRole('button', { name: /next question/i }));
    expect(heading.textContent).not.toBe(first);
  });
});
