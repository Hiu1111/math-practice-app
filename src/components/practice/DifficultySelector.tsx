import { DIFFICULTY_LEVELS, type DifficultyLevel } from '../../types';
import { DIFFICULTY_INFO } from '../../utils/operations';
import { RadioCard } from '../common/RadioCard';

interface DifficultySelectorProps {
  value: DifficultyLevel;
  onChange: (level: DifficultyLevel) => void;
  step?: number;
}

/** Choose exactly one of the four difficulty levels. */
export function DifficultySelector({ value, onChange, step }: DifficultySelectorProps) {
  return (
    <fieldset className="selector card">
      <legend className="selector__legend">
        {step !== undefined && (
          <span className="step-badge" aria-hidden="true">
            {step}
          </span>
        )}
        Choose a level
      </legend>
      <div className="radio-grid radio-grid--levels">
        {DIFFICULTY_LEVELS.map((level) => (
          <RadioCard
            key={level}
            name="difficulty"
            value={String(level)}
            checked={value === level}
            onSelect={() => onChange(level)}
            badge={
              <>
                <span aria-hidden="true">{'★'.repeat(level)}</span> Level {level}
              </>
            }
            title={DIFFICULTY_INFO[level].name}
            description={DIFFICULTY_INFO[level].description}
          />
        ))}
      </div>
    </fieldset>
  );
}
