import type { ReviewMode } from '../../types';
import { RadioCard } from '../common/RadioCard';

interface ReviewModeSelectorProps {
  value: ReviewMode;
  onChange: (mode: ReviewMode) => void;
  /** Active mistakes that match the chosen operations and level. */
  reviewableCount: number;
  /** All active mistakes, to explain why none match the current choices. */
  totalActive: number;
  step?: number;
}

/** Regular practice or practice built from previous mistakes (spec 6.2, TODO task 58). */
export function ReviewModeSelector({
  value,
  onChange,
  reviewableCount,
  totalActive,
  step,
}: ReviewModeSelectorProps) {
  const canReview = reviewableCount > 0;
  let reviewDescription: string;
  if (canReview) {
    reviewDescription = `${reviewableCount} ${reviewableCount === 1 ? 'mistake' : 'mistakes'} to practice for these choices`;
  } else if (totalActive > 0) {
    reviewDescription = `No mistakes for this math and level yet. You have ${totalActive} to practice with other choices.`;
  } else {
    reviewDescription = 'No mistakes to practice yet. Questions you mark wrong will show up here.';
  }

  return (
    <fieldset className="selector card">
      <legend className="selector__legend">
        {step !== undefined && (
          <span className="step-badge" aria-hidden="true">
            {step}
          </span>
        )}
        What kind of practice?
      </legend>
      <div className="radio-grid radio-grid--levels">
        <RadioCard
          name="review-mode"
          value="regular"
          checked={value === 'regular'}
          onSelect={() => onChange('regular')}
          title="Regular practice"
          description="New questions for the math and level you picked"
        />
        <RadioCard
          name="review-mode"
          value="mistake-review"
          checked={value === 'mistake-review'}
          disabled={!canReview}
          onSelect={() => onChange('mistake-review')}
          title="Practice my mistakes"
          description={reviewDescription}
        />
      </div>
    </fieldset>
  );
}
