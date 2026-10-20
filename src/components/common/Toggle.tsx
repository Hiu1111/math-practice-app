import { useId } from 'react';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * An on/off switch. It is a real button with role="switch", so Tab, Space and
 * Enter work and screen readers announce "on" or "off". The state is shown with
 * the knob position and an On/Off label, not colour alone.
 */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div className="toggle-row">
      <div className="toggle-row__text">
        <span id={labelId} className="toggle-row__label">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="toggle-row__description">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        className={`switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__track" aria-hidden="true">
          <span className="switch__knob" />
        </span>
        <span className="switch__state" aria-hidden="true">
          {checked ? 'On' : 'Off'}
        </span>
      </button>
    </div>
  );
}
