import type { ReactNode } from 'react';
import { calculateAccuracy } from '../../services/statisticsService';
import type { OperationStatistics } from '../../types';

interface StatCardProps {
  title: string;
  /** Small visual marker (an operation symbol or level stars), hidden from screen readers. */
  badge: ReactNode;
  /** CSS modifier for the card colour, e.g. "addition" or "level-2". */
  tone: string;
  totals: OperationStatistics;
}

/** Attempted, correct, incorrect and accuracy for one operation or level. */
export function StatCard({ title, badge, tone, totals }: StatCardProps) {
  const accuracy = calculateAccuracy(totals.correct, totals.attempted);
  const practiced = totals.attempted > 0;

  return (
    <article className={`stat-card stat-card--${tone}`} aria-label={title}>
      <header className="stat-card__header">
        <span className="stat-card__badge" aria-hidden="true">
          {badge}
        </span>
        <h3 className="stat-card__title">{title}</h3>
      </header>
      {practiced ? (
        <>
          <p className="stat-card__accuracy">
            <span className="stat-card__percent">{accuracy}%</span> accuracy
          </p>
          <div className="meter" aria-hidden="true">
            <div className="meter__fill" style={{ width: `${accuracy}%` }} />
          </div>
          <dl className="stat-card__totals">
            <div>
              <dt>Attempted</dt>
              <dd>{totals.attempted}</dd>
            </div>
            <div>
              <dt>Correct</dt>
              <dd>{totals.correct}</dd>
            </div>
            <div>
              <dt>Incorrect</dt>
              <dd>{totals.incorrect}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="stat-card__empty">Not practiced yet</p>
      )}
    </article>
  );
}
