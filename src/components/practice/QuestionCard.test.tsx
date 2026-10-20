import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Question } from '../../types';
import { QuestionCard, type QuestionCardProps } from './QuestionCard';

// The hidden card face is aria-hidden; ignore its text when matching.
const VISIBLE = { ignore: '[aria-hidden="true"] *' };

const question: Question = {
  id: 'q-test',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8',
  correctAnswer: 56,
  choices: [48, 56, 54, 64],
  difficulty: 2,
  source: 'regular',
};

function renderCard(props: Partial<QuestionCardProps> = {}) {
  const onResult = vi.fn();
  const user = userEvent.setup();
  const result = render(
    <QuestionCard
      question={question}
      questionNumber={3}
      totalQuestions={10}
      onResult={onResult}
      {...props}
    />,
  );
  return { user, onResult, ...result };
}

const choice = (n: number) =>
  screen.getByRole('button', { name: new RegExp(`^Answer \\d: ${n}$`) });
const flipButton = () => screen.getByRole('button', { name: /flip card/i });

describe('QuestionCard front', () => {
  it('shows the question, four choices and the question number', () => {
    renderCard();
    expect(screen.getByText('Question 3 of 10', VISIBLE)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What is 7 times 8?' })).toHaveTextContent(
      '7 × 8 = ?',
    );
    const group = screen.getByRole('group', { name: /answer choices/i });
    expect(within(group).getAllByRole('button')).toHaveLength(4);
  });

  it('shows just the question number in continuous practice', () => {
    renderCard({ totalQuestions: null, questionNumber: 7 });
    expect(screen.getByText('Question 7', VISIBLE)).toBeInTheDocument();
  });

  it('keeps Flip Card disabled until an answer is selected', async () => {
    const { user } = renderCard();
    expect(flipButton()).toBeDisabled();
    await user.click(choice(54));
    expect(flipButton()).toBeEnabled();
  });

  it('highlights the selected answer and lets the student change it before flipping', async () => {
    const { user } = renderCard();
    await user.click(choice(54));
    expect(choice(54)).toHaveAttribute('aria-pressed', 'true');
    await user.click(choice(56));
    expect(choice(56)).toHaveAttribute('aria-pressed', 'true');
    expect(choice(54)).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not count anything when an answer is selected', async () => {
    const { user, onResult } = renderCard();
    await user.click(choice(56));
    expect(onResult).not.toHaveBeenCalled();
  });
});

describe('QuestionCard flip and back', () => {
  it('reveals the correct answer and the student answer after flipping', async () => {
    const { user } = renderCard();
    await user.click(choice(54));
    await user.click(flipButton());

    const answer = screen.getByRole('heading', { name: '7 times 8 equals 56' });
    expect(answer).toHaveTextContent('7 × 8 = 56');
    expect(answer).toHaveFocus();
    expect(screen.getByText(/your answer:/i)).toHaveTextContent('Your answer: 54');
    expect(screen.getByText(/different from the answer/i)).toBeInTheDocument();
  });

  it('tells the student when their answer matches', async () => {
    const { user } = renderCard();
    await user.click(choice(56));
    await user.click(flipButton());
    expect(screen.getByText(/same as the answer/i)).toBeInTheDocument();
  });

  it('hides the front after flipping so the answer cannot be changed', async () => {
    const { user } = renderCard();
    await user.click(choice(54));
    await user.click(flipButton());
    expect(screen.queryByRole('button', { name: /flip card/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /answer choices/i })).not.toBeInTheDocument();
  });

  it('keeps the back hidden (and its buttons unreachable) before flipping', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: /i got it right/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /equals/i })).not.toBeInTheDocument();
  });

  it('shows a brief explanation when enabled, and none when disabled', async () => {
    const { user, unmount } = renderCard();
    await user.click(choice(56));
    await user.click(flipButton());
    expect(screen.getByText('7 groups of 8 make 56.')).toBeInTheDocument();
    unmount();

    const second = renderCard({ showExplanation: false });
    await second.user.click(choice(56));
    await second.user.click(flipButton());
    expect(screen.queryByText(/groups of/)).not.toBeInTheDocument();
  });
});

describe('QuestionCard self-reported result', () => {
  it.each([
    [/i got it right/i, true],
    [/i got it wrong/i, false],
  ])('reports %s with the selected answer', async (buttonName, expected) => {
    const { user, onResult } = renderCard();
    await user.click(choice(48));
    await user.click(flipButton());
    await user.click(screen.getByRole('button', { name: buttonName }));
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(48, expected);
  });

  it('records only once, even if both buttons are pressed or one is pressed twice', async () => {
    const { user, onResult } = renderCard();
    await user.click(choice(56));
    await user.click(flipButton());
    const right = screen.getByRole('button', { name: /i got it right/i });
    const wrong = screen.getByRole('button', { name: /i got it wrong/i });
    await user.click(right);
    await user.click(right);
    await user.click(wrong);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(right).toBeDisabled();
    expect(wrong).toBeDisabled();
  });
});

describe('QuestionCard animation setting', () => {
  it('uses the animated flip by default and a static swap when animation is off', async () => {
    const { user, unmount } = renderCard();
    expect(screen.getByTestId('question-card')).toHaveClass('flip-card--animated');
    unmount();

    renderCard({ animate: false });
    const card = screen.getByTestId('question-card');
    expect(card).toHaveClass('flip-card--static');
    await user.click(choice(56));
    await user.click(flipButton());
    // The card still works without animation.
    expect(card).toHaveClass('is-flipped');
    expect(screen.getByRole('button', { name: /i got it right/i })).toBeInTheDocument();
  });
});

describe('QuestionCard keyboard use', () => {
  it('can be completed with Tab, Enter and Space only', async () => {
    const { user, onResult } = renderCard();
    await user.tab(); // first answer choice
    expect(screen.getByRole('button', { name: /^Answer 1:/ })).toHaveFocus();
    await user.keyboard(' ');
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab(); // Flip Card
    expect(flipButton()).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab(); // from the revealed answer to "I Got It Right"
    await user.keyboard('{Enter}');
    expect(onResult).toHaveBeenCalledWith(48, true);
  });
});
