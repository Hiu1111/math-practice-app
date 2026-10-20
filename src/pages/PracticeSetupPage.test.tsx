import { screen, within } from '@testing-library/react';
import { renderApp } from '../test/renderApp';

const startButton = () => screen.getByRole('button', { name: /start session/i });
const opButton = (name: RegExp) =>
  within(screen.getByRole('group', { name: /pick your math/i })).getByRole('button', { name });

describe('practice setup page', () => {
  it('starts with sensible defaults: addition, Level 1, 10 questions', () => {
    renderApp('/practice/setup');
    expect(opButton(/addition/i)).toHaveAttribute('aria-pressed', 'true');
    expect(opButton(/subtraction/i)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('radio', { name: /beginner/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^10 questions/i })).toBeChecked();
    expect(startButton()).toBeEnabled();
  });

  it('shows four difficulty levels with names and descriptions', () => {
    renderApp('/practice/setup');
    for (const name of [/beginner/i, /easy/i, /intermediate/i, /advanced/i]) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/times tables up to 5/i)).toBeInTheDocument();
  });

  it('offers 5, 10, 20 and continuous session lengths', () => {
    renderApp('/practice/setup');
    for (const name of [/^5 questions/i, /^10 questions/i, /^20 questions/i, /keep going/i]) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
  });

  it('allows more than one operation to be selected', async () => {
    const { user } = renderApp('/practice/setup');
    await user.click(opButton(/multiplication/i));
    expect(opButton(/addition/i)).toHaveAttribute('aria-pressed', 'true');
    expect(opButton(/multiplication/i)).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables Start Session and explains why when no operation is selected', async () => {
    const { user } = renderApp('/practice/setup');
    await user.click(opButton(/addition/i));
    expect(opButton(/addition/i)).toHaveAttribute('aria-pressed', 'false');
    expect(startButton()).toBeDisabled();
    expect(screen.getByText(/pick at least one kind of math/i)).toBeInTheDocument();

    await user.click(opButton(/division/i));
    expect(startButton()).toBeEnabled();
  });

  it('selects all operations with the shortcut, and clears them again', async () => {
    const { user } = renderApp('/practice/setup');
    await user.click(screen.getByRole('button', { name: /mix them all/i }));
    for (const name of [/addition/i, /subtraction/i, /multiplication/i, /division/i]) {
      expect(opButton(name)).toHaveAttribute('aria-pressed', 'true');
    }
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(opButton(/addition/i)).toHaveAttribute('aria-pressed', 'false');
    expect(startButton()).toBeDisabled();
  });

  it('allows only one difficulty level at a time', async () => {
    const { user } = renderApp('/practice/setup');
    await user.click(screen.getByRole('radio', { name: /advanced/i }));
    expect(screen.getByRole('radio', { name: /advanced/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /beginner/i })).not.toBeChecked();
  });

  it('works with the keyboard: Space toggles an operation, arrows change the level', async () => {
    const { user } = renderApp('/practice/setup');
    opButton(/subtraction/i).focus();
    await user.keyboard(' ');
    expect(opButton(/subtraction/i)).toHaveAttribute('aria-pressed', 'true');

    screen.getByRole('radio', { name: /beginner/i }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /easy/i })).toBeChecked();
  });

  it('passes the chosen configuration to the practice session', async () => {
    const { user } = renderApp('/practice/setup');
    await user.click(opButton(/multiplication/i));
    await user.click(screen.getByRole('radio', { name: /intermediate/i }));
    await user.click(screen.getByRole('radio', { name: /^5 questions/i }));
    await user.click(startButton());

    const settings = screen.getByRole('list', { name: /session settings/i });
    expect(within(settings).getByText(/addition and multiplication/i)).toBeInTheDocument();
    expect(within(settings).getByText(/level 3 · intermediate/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /session progress/i })).toHaveAttribute(
      'aria-valuemax',
      '5',
    );
  });

  it('sends visitors without a session back to setup with a friendly notice', () => {
    renderApp('/practice/session');
    expect(screen.getByRole('heading', { level: 1, name: /get ready/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/set up a practice session first/i);
  });
});
