import { screen, within } from '@testing-library/react';
import { STORAGE_KEYS } from '../services/storageService';
import { listSimilarCandidates } from '../services/similarQuestionGenerator';
import { answerQuestion, startSession } from '../test/practiceHelpers';
import type { AppStatistics, MistakePattern, PracticeAttempt } from '../types';

/**
 * End-to-end journeys through the real app (TODO task 81, spec 21.3). Nothing is
 * seeded: every record is created by clicking through the UI, and every check
 * reads what a student sees or what was actually written to localStorage.
 */

const OP_SYMBOL = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };
const COMPUTE = {
  addition: (a: number, b: number) => a + b,
  subtraction: (a: number, b: number) => a - b,
  multiplication: (a: number, b: number) => a * b,
  division: (a: number, b: number) => a / b,
};

const stored = <T,>(key: string): T => JSON.parse(localStorage.getItem(key) ?? 'null') as T;
const attempts = () => stored<PracticeAttempt[]>(STORAGE_KEYS.attempts) ?? [];
const statistics = () => stored<AppStatistics>(STORAGE_KEYS.statistics);
const patterns = () => stored<MistakePattern[]>(STORAGE_KEYS.mistakePatterns) ?? [];
const currentQuestion = () => screen.getByRole('heading', { level: 2 }).textContent;

describe('a full addition session (task 81)', () => {
  it('asks five correct addition questions, summarises them and updates every statistic', async () => {
    const { user, router } = await startSession({ length: /^5 questions/i });
    const results = [true, false, true, true, false];
    for (const correct of results) await answerQuestion(user, correct);

    // Summary shows what happened.
    expect(screen.getByRole('heading', { level: 1, name: /session complete/i })).toBeVisible();
    const summary = screen.getByLabelText('Results');
    expect(summary).toHaveTextContent('60%');

    // Every stored attempt is a real Level 1 addition with the right answer.
    const saved = attempts();
    expect(saved).toHaveLength(5);
    for (const a of saved) {
      expect(a).toMatchObject({ operation: 'addition', difficulty: 1 });
      expect(a.correctAnswer).toBe(a.firstOperand + a.secondOperand);
      expect(a.correctAnswer).toBeLessThanOrEqual(20);
    }
    expect(saved.map((a) => a.selfReportedCorrect)).toEqual(results);

    // The Statistics page agrees.
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
        name: /statistics/i,
      }),
    );
    expect(router.state.location.pathname).toBe('/statistics');
    const overall = screen.getByLabelText('Overall results');
    expect(overall).toHaveTextContent('5');
    expect(overall).toHaveTextContent('60%');
    const addition = screen.getByRole('article', { name: 'Addition' });
    expect(addition).toHaveTextContent('60%');
    expect(statistics().byOperation.addition).toEqual({ attempted: 5, correct: 3, incorrect: 2 });
    expect(statistics().byDifficulty[1]).toEqual({ attempted: 5, correct: 3, incorrect: 2 });
  });
});

describe('a mixed-operation session (task 81)', () => {
  it('only asks the chosen operations, uses more than one, and keeps the breakdowns consistent', async () => {
    const { user } = await startSession({
      operations: [/subtraction/i, /multiplication/i, /division/i],
      level: /intermediate/i,
      length: /^20 questions/i,
    });
    for (let i = 0; i < 20; i++) await answerQuestion(user, i % 4 !== 0);

    const saved = attempts();
    expect(saved).toHaveLength(20);
    const used = new Set(saved.map((a) => a.operation));
    expect(used.has('addition')).toBe(false);
    expect(used.size).toBeGreaterThan(1);
    for (const a of saved) {
      expect(a.difficulty).toBe(3);
      expect(a.correctAnswer).toBe(COMPUTE[a.operation](a.firstOperand, a.secondOperand));
      expect(Number.isInteger(a.correctAnswer) && a.correctAnswer >= 0).toBe(true);
      if (a.operation === 'division') expect(a.secondOperand).not.toBe(0);
    }

    const stats = statistics();
    expect(stats).toMatchObject({ attempted: 20, correct: 15, incorrect: 5 });
    const byOp = Object.values(stats.byOperation);
    expect(byOp.reduce((sum, s) => sum + s.attempted, 0)).toBe(20);
    expect(byOp.reduce((sum, s) => sum + s.correct, 0)).toBe(15);
  });
});

describe('the spec 21.3 flow, entirely through the UI', () => {
  it('a wrong answer updates statistics, stores a mistake, and mistake review asks a similar question until it is mastered', async () => {
    // 1–4. Start a session, select an answer, flip the card, mark it incorrect.
    const { user } = await startSession({ operations: [/multiplication/i], level: /easy/i });
    await answerQuestion(user, false);

    // 5. Statistics update immediately.
    expect(statistics()).toMatchObject({ attempted: 1, correct: 0, incorrect: 1 });
    expect(statistics().byOperation.multiplication.incorrect).toBe(1);

    // 6. A mistake pattern is stored for exactly that question.
    const [missed] = attempts();
    expect(patterns()).toHaveLength(1);
    const [pattern] = patterns();
    expect(pattern).toMatchObject({
      operation: 'multiplication',
      firstOperand: missed.firstOperand,
      secondOperand: missed.secondOperand,
      correctAnswer: missed.correctAnswer,
      difficulty: 2,
      incorrectCount: 1,
      mastered: false,
    });

    // Finish the session correctly so no other mistakes are created.
    for (let i = 0; i < 4; i++) await answerQuestion(user, true);
    expect(patterns()).toHaveLength(1);

    // 7. Start mistake-review mode from the summary.
    await user.click(screen.getByRole('link', { name: /practice mistakes/i }));
    expect(screen.getByText(/mistake practice/i)).toBeInTheDocument();

    // 8. A similar question appears, and correct answers lead to mastery.
    const allowed = listSimilarCandidates(pattern).map(
      (c) => `${c.firstOperand} ${OP_SYMBOL[c.operation]} ${c.secondOperand} = ?`,
    );
    expect(allowed.length).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) {
      expect(allowed).toContain(currentQuestion());
      await answerQuestion(user, true);
    }

    expect(screen.getByRole('heading', { level: 1, name: /session complete/i })).toBeVisible();
    expect(screen.getByText(/you mastered every mistake/i)).toBeInTheDocument();
    expect(patterns()[0]).toMatchObject({ similarCorrectCount: 3, mastered: true });
    expect(statistics().review).toEqual({ attempted: 3, correct: 3, incorrect: 0 });

    // The Statistics page reports the mastered mistake.
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
        name: /statistics/i,
      }),
    );
    await user.click(screen.getByText(/mastered mistakes \(1\)/i));
    const mastered = screen.getByRole('list', { name: 'Mastered mistakes' });
    expect(mastered).toHaveTextContent(`${pattern.firstOperand} × ${pattern.secondOperand}`);
  });
});
