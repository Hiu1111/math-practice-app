import { formatNumber } from '../../utils/operations';

interface AnswerChoiceProps {
  value: number;
  /** 1-based position, shown as a small label and used in the accessible name. */
  position: number;
  selected: boolean;
  /** True once the card has been flipped: the answer can no longer change. */
  locked: boolean;
  onSelect: (value: number) => void;
}

/** One multiple-choice answer, shown as a large button. */
export function AnswerChoice({ value, position, selected, locked, onSelect }: AnswerChoiceProps) {
  return (
    <button
      type="button"
      className={`answer-choice${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      aria-label={`Answer ${position}: ${formatNumber(value)}`}
      disabled={locked}
      onClick={() => onSelect(value)}
    >
      <span className="answer-choice__key" aria-hidden="true">
        {position}
      </span>
      <span className="answer-choice__value">{formatNumber(value)}</span>
      <span className="answer-choice__check" aria-hidden="true">
        ✓
      </span>
    </button>
  );
}
