import type { ReactNode } from 'react';

interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  centered?: boolean;
  /** Accessible name, when the visible text alone would read oddly. */
  ariaLabel?: string;
}

/**
 * A large, tappable card backed by a real radio input, so arrow keys,
 * Tab and screen readers all work the way they do for native radios.
 * The selected state is shown with a border, background and a check mark (not colour alone).
 */
export function RadioCard({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
  badge,
  centered = false,
  ariaLabel,
}: RadioCardProps) {
  return (
    <label
      className={`radio-card${checked ? ' is-selected' : ''}${centered ? ' radio-card--center' : ''}`}
    >
      <input
        type="radio"
        className="visually-hidden"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        aria-label={ariaLabel}
      />
      <span className="radio-card__body">
        {badge && <span className="radio-card__badge">{badge}</span>}
        <span className="radio-card__title">{title}</span>
        {description && <span className="radio-card__desc">{description}</span>}
      </span>
      <span className="radio-card__check" aria-hidden="true">
        ✓
      </span>
    </label>
  );
}
