import { memo } from 'react';
import { MATH_OPERATIONS, type AppStatistics } from '../../types';
import { OPERATION_INFO } from '../../utils/operations';
import { StatCard } from './StatCard';

/** One card per operation (spec 6.6, statistics by operation). */
export const OperationStatistics = memo(function OperationStatistics({
  statistics,
}: {
  statistics: AppStatistics;
}) {
  return (
    <section className="stats-section card" aria-labelledby="stats-by-operation">
      <h2 id="stats-by-operation" className="stats-section__title">
        By operation
      </h2>
      <div className="stat-card-grid">
        {MATH_OPERATIONS.map((op) => (
          <StatCard
            key={op}
            title={OPERATION_INFO[op].label}
            badge={OPERATION_INFO[op].symbol}
            tone={op}
            totals={statistics.byOperation[op]}
          />
        ))}
      </div>
    </section>
  );
});
