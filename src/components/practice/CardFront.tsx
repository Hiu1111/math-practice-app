import { useEffect, useRef } from 'react';
import type { Question } from '../../types';
import { questionCountLabel, speakQuestion } from '../../utils/operations';
import { Button } from '../common/Button';
import { AnswerChoice } from './AnswerChoice';

interface CardFrontProps {
  question: Question;
  questionNumber: number;
  /** Total questions in the session, or null for continuous practice. */
  totalQuestions: number | null;
  selectedAnswer: number | null;
  locked: boolean;
  /** Move keyboard/screen-reader focus to the question when the card appears. */
  autoFocus: boolean;
  onSelect: (value: number) => void;
  onFlip: () => void;
}

/** Front of the card: the question, four answer choices and the Flip Card button. */
export function CardFront({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  locked,
  autoFocus,
  onSelect,
  onFlip,
}: CardFrontProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (autoFocus) headingRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const hasAnswer = selectedAnswer !== null;

  return (
    <div className="question-card">
      <p className="question-card__count">{questionCountLabel(questionNumber, totalQuestions)}</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="math-question"
        aria-label={speakQuestion(
          question.operation,
          question.firstOperand,
          question.secondOperand,
        )}
      >
        {question.displayText} = ?
      </h2>
      <div className="answer-grid" role="group" aria-label="Answer choices">
        {question.choices.map((choice, index) => (
          <AnswerChoice
            key={choice}
            value={choice}
            position={index + 1}
            selected={selectedAnswer === choice}
            locked={locked}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p className="question-card__hint" id={`flip-hint-${question.id}`}>
        {hasAnswer ? 'Ready? Flip the card to check!' : 'Pick an answer, then flip the card.'}
      </p>
      <Button
        size="lg"
        onClick={onFlip}
        disabled={!hasAnswer || locked}
        aria-describedby={`flip-hint-${question.id}`}
      >
        Flip Card <span aria-hidden="true">↻</span>
      </Button>
    </div>
  );
}
