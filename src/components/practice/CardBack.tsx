import { useEffect, useRef } from 'react';
import type { Question } from '../../types';
import { explainQuestion } from '../../utils/explanations';
import { formatNumber, questionCountLabel, speakEquation } from '../../utils/operations';
import { Button } from '../common/Button';

interface CardBackProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number | null;
  selectedAnswer: number | null;
  /** True while the back is the visible face. Focus moves here when it becomes active. */
  active: boolean;
  showExplanation: boolean;
  /** True once a result has been chosen, so neither button can be pressed again. */
  recorded: boolean;
  onRecord: (correct: boolean) => void;
}

/** Back of the card: the correct answer, the student's answer and the self-report buttons. */
export function CardBack({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  active,
  showExplanation,
  recorded,
  onRecord,
}: CardBackProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Revealing the answer moves focus to it, so screen readers announce it right away.
  useEffect(() => {
    if (active) headingRef.current?.focus({ preventScroll: true });
  }, [active]);

  const { operation, firstOperand, secondOperand, correctAnswer } = question;
  const matches = selectedAnswer === correctAnswer;

  return (
    <div className="question-card question-card--back">
      <p className="question-card__count">{questionCountLabel(questionNumber, totalQuestions)}</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="math-question math-question--answer"
        aria-label={speakEquation(operation, firstOperand, secondOperand, correctAnswer)}
      >
        {question.displayText} ={' '}
        <span className="answer-highlight">{formatNumber(correctAnswer)}</span>
      </h2>

      {selectedAnswer !== null && (
        <p className={`your-answer ${matches ? 'is-match' : 'is-different'}`}>
          <span>
            Your answer: <strong>{formatNumber(selectedAnswer)}</strong>
          </span>
          <span className="your-answer__note">
            {matches ? '✓ Same as the answer' : '✗ Different from the answer'}
          </span>
        </p>
      )}

      {showExplanation && (
        <p className="explanation">
          <span aria-hidden="true">💡 </span>
          {explainQuestion(question)}
        </p>
      )}

      <p className="question-card__hint">Did you get it right?</p>
      <div className="result-buttons">
        <Button variant="success" size="lg" disabled={recorded} onClick={() => onRecord(true)}>
          <span aria-hidden="true">👍</span> I Got It Right
        </Button>
        <Button variant="warning" size="lg" disabled={recorded} onClick={() => onRecord(false)}>
          <span aria-hidden="true">🔁</span> I Got It Wrong
        </Button>
      </div>
    </div>
  );
}
