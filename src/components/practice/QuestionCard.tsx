import { useEffect, useRef, useState } from 'react';
import type { Question } from '../../types';
import { CardBack } from './CardBack';
import { CardFront } from './CardFront';
import { answerShortcutIndex, isModalOpen, isTypingTarget } from '../../utils/keyboard';

export interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  /** Total questions in the session, or null for continuous practice. */
  totalQuestions: number | null;
  /** Animate the flip. When false (or prefers-reduced-motion) the faces swap instantly. */
  animate?: boolean;
  showExplanation?: boolean;
  /** Focus the question when the card appears (used for every card after the first). */
  autoFocus?: boolean;
  /** Called once, after the card is flipped and the student reports right or wrong. */
  onResult: (selectedAnswer: number, correct: boolean) => void;
  /** Start from a saved state (after a page refresh). */
  initialSelectedAnswer?: number | null;
  initialFlipped?: boolean;
  /** Called whenever the selected answer or flip state changes, so it can be saved. */
  onCardStateChange?: (selectedAnswer: number | null, flipped: boolean) => void;
}

/**
 * An interactive flash card. Give it a new `key` for each question so the
 * selected answer, flip state and recorded flag reset automatically.
 */
export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  animate = true,
  showExplanation = true,
  autoFocus = false,
  onResult,
  initialSelectedAnswer = null,
  initialFlipped = false,
  onCardStateChange,
}: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(initialSelectedAnswer);
  const [isCardFlipped, setIsCardFlipped] = useState(
    initialFlipped && initialSelectedAnswer !== null,
  );
  const [recorded, setRecorded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const selectAnswer = (value: number) => {
    if (isCardFlipped) return;
    setSelectedAnswer(value);
    onCardStateChange?.(value, false);
  };

  // Number keys 1–4 choose an answer (spec 14). Focus follows, so screen readers
  // announce the chosen answer. Ignored while typing or when a dialog is open.
  useEffect(() => {
    if (isCardFlipped) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const index = answerShortcutIndex(event);
      if (index < 0 || index >= question.choices.length) return;
      if (event.defaultPrevented || isTypingTarget(event.target) || isModalOpen()) return;
      event.preventDefault();
      setSelectedAnswer(question.choices[index]);
      onCardStateChange?.(question.choices[index], false);
      cardRef.current?.querySelectorAll<HTMLButtonElement>('.answer-choice')[index]?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isCardFlipped, question.choices, onCardStateChange]);

  const flip = () => {
    if (selectedAnswer === null) return;
    setIsCardFlipped(true);
    onCardStateChange?.(selectedAnswer, true);
  };

  // Spec 18: record only after an answer was chosen and the card was flipped, and only once.
  const record = (correct: boolean) => {
    if (!isCardFlipped || selectedAnswer === null || recorded) return;
    setRecorded(true);
    onResult(selectedAnswer, correct);
  };

  const classes = [
    'flip-card',
    isCardFlipped ? 'is-flipped' : '',
    animate ? 'flip-card--animated' : 'flip-card--static',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-testid="question-card" ref={cardRef}>
      <div className="flip-card__inner">
        <div
          className="flip-card__face flip-card__face--front"
          aria-hidden={isCardFlipped || undefined}
          inert={isCardFlipped}
        >
          <CardFront
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            locked={isCardFlipped}
            autoFocus={autoFocus}
            onSelect={selectAnswer}
            onFlip={flip}
          />
        </div>
        <div
          className="flip-card__face flip-card__face--back"
          aria-hidden={!isCardFlipped || undefined}
          inert={!isCardFlipped}
        >
          <CardBack
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            selectedAnswer={selectedAnswer}
            active={isCardFlipped}
            showExplanation={showExplanation}
            recorded={recorded}
            onRecord={record}
          />
        </div>
      </div>
    </div>
  );
}
