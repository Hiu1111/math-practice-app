import { MATH_OPERATIONS, type MathOperation } from '../../types';
import { OPERATION_INFO } from '../../utils/operations';
import { Button } from '../common/Button';

interface OperationSelectorProps {
  selected: readonly MathOperation[];
  onChange: (operations: MathOperation[]) => void;
  step?: number;
}

/** Toggle buttons for choosing one or more operations, plus a "mix them all" shortcut. */
export function OperationSelector({ selected, onChange, step }: OperationSelectorProps) {
  const allSelected = MATH_OPERATIONS.every((op) => selected.includes(op));

  const toggle = (operation: MathOperation) => {
    const next = selected.includes(operation)
      ? selected.filter((op) => op !== operation)
      : MATH_OPERATIONS.filter((op) => op === operation || selected.includes(op));
    onChange(next);
  };

  return (
    <fieldset className="selector card">
      <legend className="selector__legend">
        {step !== undefined && (
          <span className="step-badge" aria-hidden="true">
            {step}
          </span>
        )}
        Pick your math
      </legend>
      <p className="selector__hint" id="operation-hint">
        Choose one or more. Pick them all to mix it up!
      </p>
      <div className="op-grid" role="group" aria-describedby="operation-hint">
        {MATH_OPERATIONS.map((op) => {
          const info = OPERATION_INFO[op];
          const isSelected = selected.includes(op);
          return (
            <button
              key={op}
              type="button"
              className={`op-toggle op-toggle--${op}${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => toggle(op)}
            >
              <span className="op-toggle__symbol" aria-hidden="true">
                {info.symbol}
              </span>
              <span className="op-toggle__label">{info.label}</span>
              <span className="op-toggle__check" aria-hidden="true">
                ✓
              </span>
            </button>
          );
        })}
      </div>
      <div className="selector__actions">
        <Button variant="ghost" onClick={() => onChange(allSelected ? [] : [...MATH_OPERATIONS])}>
          {allSelected ? 'Clear all' : 'Mix them all!'}
        </Button>
      </div>
    </fieldset>
  );
}
