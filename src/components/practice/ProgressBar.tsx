interface ProgressBarProps {
  answered: number;
  total: number;
}

/** Visual session progress, exposed to screen readers as a progressbar. */
export function ProgressBar({ answered, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Session progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={answered}
      aria-valuetext={`${answered} of ${total} questions answered`}
    >
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
