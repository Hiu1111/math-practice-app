import { DIFFICULTY_LEVELS, type AppStatistics } from '../../types';
import { DIFFICULTY_INFO } from '../../utils/operations';
import { StatCard } from './StatCard';

/** One card per difficulty level (spec 6.6, statistics by difficulty). */
export function DifficultyStatistics({ statistics }: { statistics: AppStatistics }) {
  return (
    <section className="stats-section card" aria-labelledby="stats-by-level">
      <h2 id="stats-by-level" className="stats-section__title">
        By level
      </h2>
      <div className="stat-card-grid">
        {DIFFICULTY_LEVELS.map((level) => (
          <StatCard
            key={level}
            title={`Level ${level} · ${DIFFICULTY_INFO[level].name}`}
            badge={'★'.repeat(level)}
            tone="level"
            totals={statistics.byDifficulty[level]}
          />
        ))}
      </div>
    </section>
  );
}
