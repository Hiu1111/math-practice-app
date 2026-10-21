import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { renderApp } from './renderApp';

/** Ignore text on the hidden (aria-hidden) card face when matching by text. */
export const VISIBLE = { ignore: '[aria-hidden="true"] *' };

interface StartOptions {
  operations?: RegExp[];
  level?: RegExp;
  length?: RegExp;
}

/** Go through the setup page and start a session. Defaults: addition, Beginner, 5 questions. */
export async function startSession({
  operations = [/addition/i],
  level = /beginner/i,
  length = /^5 questions/i,
}: StartOptions = {}) {
  const result = renderApp('/practice/setup');
  const { user } = result;
  const group = screen.getByRole('group', { name: /pick your math/i });
  // Turn off the default selection, then choose the requested operations.
  await user.click(within(group).getByRole('button', { name: /addition/i }));
  for (const op of operations) await user.click(within(group).getByRole('button', { name: op }));
  await user.click(screen.getByRole('radio', { name: level }));
  await user.click(screen.getByRole('radio', { name: length }));
  await user.click(screen.getByRole('button', { name: /start session/i }));
  return result;
}

/** The answer button at a position (1–4) on the visible card. */
export function answerButton(position: number): HTMLElement {
  const group = screen.getByRole('group', { name: /answer choices/i });
  return within(group).getAllByRole('button')[position - 1];
}

/** Select an answer, flip the card and report the result. */
export async function answerQuestion(user: UserEvent, correct: boolean, choice = 1) {
  await user.click(answerButton(choice));
  await user.click(screen.getByRole('button', { name: /flip card/i }));
  await user.click(
    screen.getByRole('button', { name: correct ? /i got it right/i : /i got it wrong/i }),
  );
}
