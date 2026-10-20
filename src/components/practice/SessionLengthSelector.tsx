import { SESSION_LENGTHS, type SessionLength } from '../../types';
import { RadioCard } from '../common/RadioCard';

interface SessionLengthSelectorProps {
  value: SessionLength;
  onChange: (length: SessionLength) => void;
  step?: number;
  legend?: string;
}

/** Choose 5, 10 or 20 questions, or continuous practice. */
export function SessionLengthSelector({
  value,
  onChange,
  step,
  legend = 'How many questions?',
}: SessionLengthSelectorProps) {
  return (
    <fieldset className="selector card">
      <legend className="selector__legend">
        {step !== undefined && (
          <span className="step-badge" aria-hidden="true">
            {step}
          </span>
        )}
        {legend}
      </legend>
      <div className="radio-grid radio-grid--lengths">
        {SESSION_LENGTHS.map((length) => (
          <RadioCard
            key={String(length)}
            name="session-length"
            value={String(length)}
            checked={value === length}
            onSelect={() => onChange(length)}
            centered
            ariaLabel={
              length === 'continuous' ? 'Keep going, stop whenever you like' : `${length} questions`
            }
            title={length === 'continuous' ? '∞' : length}
            description={length === 'continuous' ? 'Keep going' : 'questions'}
          />
        ))}
      </div>
    </fieldset>
  );
}
