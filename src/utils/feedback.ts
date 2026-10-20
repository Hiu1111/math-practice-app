import { randomChoice, type RandomFn } from './math';

/** Encouraging messages (spec 13.4). None of them shame or discourage the student. */
export const CORRECT_FEEDBACK = ['Great job!', 'Nice work!', 'You got it!', 'Awesome!', 'Super!'];
export const INCORRECT_FEEDBACK = [
  'Keep practicing!',
  'You are improving!',
  'Good try! Mistakes help us learn.',
  'Nice effort! On to the next one.',
];

/** A random encouraging message, avoiding the one shown last time. */
export function pickFeedback(correct: boolean, previous?: string, rng: RandomFn = Math.random) {
  const options = correct ? CORRECT_FEEDBACK : INCORRECT_FEEDBACK;
  const fresh = options.filter((message) => message !== previous);
  return randomChoice(fresh.length > 0 ? fresh : options, rng);
}

export interface SummaryMessage {
  emoji: string;
  text: string;
}

/** A headline for the session summary. Every level of score gets encouragement. */
export function summaryMessage(accuracy: number): SummaryMessage {
  if (accuracy === 100) return { emoji: '🏆', text: 'Perfect score! Amazing work!' };
  if (accuracy >= 80) return { emoji: '🌟', text: 'Great job!' };
  if (accuracy >= 50) return { emoji: '👍', text: 'Nice work! Keep it up!' };
  return { emoji: '💪', text: 'Keep practicing. You are improving!' };
}
