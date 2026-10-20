import { calculateAccuracy } from '../../services/statisticsService';
import type { OperationStatistics } from '../../types';

/** Overall totals and accuracy (spec 6.6, overall statistics). */
export function StatisticsOverview({ totals }: { totals: OperationStatistics }) {
  const accuracy = calculateAccuracy(totals.correct, totals.attempted);
  return (
    <section className="stats-section card" aria-labelledby="stats-overall">
      <h2 id="stats-overall" className="stats-section__title">
        Overall
      </h2>
      <dl className="stat-grid" aria-label="Overall results">
        <div className="stat-tile">
          <dt>Questions</dt>
          <dd>{totals.attempted}</dd>
        </div>
        <div className="stat-tile stat-tile--correct">
          <dt>
            <span aria-hidden="true">✓ </span>Correct
          </dt>
          <dd>{totals.correct}</dd>
        </div>
        <div className="stat-tile stat-tile--incorrect">
          <dt>
            <span aria-hidden="true">↻ </span>Incorrect
          </dt>
          <dd>{totals.incorrect}</dd>
        </div>
        <div className="stat-tile stat-tile--accuracy">
          <dt>Accuracy</dt>
          <dd>{accuracy}%</dd>
        </div>
      </dl>
    </section>
  );
}
