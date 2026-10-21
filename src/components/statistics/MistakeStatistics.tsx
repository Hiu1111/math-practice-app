import { memo, useMemo, useState } from 'react';
import { Button } from '../common/Button';
import { isMastered } from '../../services/mistakeService';
import { computeMistakeStatistics, sortByMostMissed } from '../../services/statisticsService';
import type { AppStatistics, MistakePattern } from '../../types';
import {
  describeOperations,
  formatNumber,
  formatQuestion,
  formatSessionDate,
} from '../../utils/operations';

interface MistakeStatisticsProps {
  patterns: readonly MistakePattern[];
  statistics: AppStatistics;
  masteryThreshold: number;
}

/** How many mistakes to list before "Show all" (keeps the page short and fast). */
export const MISTAKES_SHOWN_AT_FIRST = 10;

const times = (n: number) => `${n} ${n === 1 ? 'time' : 'times'}`;

/** "8 × 7 = 56" */
function factText(p: MistakePattern) {
  return `${formatQuestion(p.operation, p.firstOperand, p.secondOperand)} = ${formatNumber(p.correctAnswer)}`;
}

/** Mistake review statistics and details (spec 6.6, TODO tasks 63–65). */
export const MistakeStatistics = memo(function MistakeStatistics({
  patterns,
  statistics,
  masteryThreshold,
}: MistakeStatisticsProps) {
  // Recalculated only when the saved mistakes, statistics or threshold change.
  const stats = useMemo(
    () => computeMistakeStatistics(patterns, statistics, masteryThreshold),
    [patterns, statistics, masteryThreshold],
  );
  const { active, mastered } = useMemo(
    () => ({
      active: sortByMostMissed(patterns.filter((p) => !isMastered(p, masteryThreshold))),
      mastered: sortByMostMissed(patterns.filter((p) => isMastered(p, masteryThreshold))),
    }),
    [patterns, masteryThreshold],
  );
  const [showAllActive, setShowAllActive] = useState(false);
  const [masteredOpen, setMasteredOpen] = useState(false);
  const shownActive = showAllActive ? active : active.slice(0, MISTAKES_SHOWN_AT_FIRST);

  return (
    <section className="stats-section card" aria-labelledby="stats-mistakes">
      <h2 id="stats-mistakes" className="stats-section__title">
        Mistake practice
      </h2>

      {patterns.length === 0 ? (
        <p className="stats-section__empty">
          No mistakes yet. Questions you mark wrong will show up here so you can practice them.
        </p>
      ) : (
        <>
          <dl className="stat-grid" aria-label="Mistake results">
            <div className="stat-tile stat-tile--incorrect">
              <dt>To practice</dt>
              <dd>{stats.activePatterns}</dd>
            </div>
            <div className="stat-tile stat-tile--correct">
              <dt>Mastered</dt>
              <dd>{stats.masteredPatterns}</dd>
            </div>
            <div className="stat-tile">
              <dt>Similar questions practiced</dt>
              <dd>{stats.similarQuestionsPracticed}</dd>
            </div>
            <div className="stat-tile stat-tile--accuracy">
              <dt>Similar questions correct</dt>
              <dd>{stats.similarQuestionsCorrect}</dd>
            </div>
          </dl>

          <p className="mistake-highlight">
            <span className="mistake-highlight__label">Most missed math: </span>
            <strong>{describeOperations(stats.mostMissedOperations)}</strong>
            {stats.mostMissedOperations.length > 1 && ' (tied)'}
          </p>

          <div className="mistake-columns">
            <div>
              <h3 className="mistake-subtitle">Most missed facts</h3>
              <ol className="fact-list" aria-label="Most missed facts">
                {stats.mostMissedFacts.map((p) => (
                  <li key={p.id} className="fact-list__item">
                    <span className="fact-list__fact">{factText(p)}</span>
                    <span className="fact-list__meta">missed {times(p.incorrectCount)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="mistake-subtitle">Still practicing</h3>
              {active.length === 0 ? (
                <p className="stats-section__empty">Every mistake is mastered. Amazing!</p>
              ) : (
                <>
                  <ul
                    id="mistakes-to-practice"
                    className="fact-list"
                    aria-label="Mistakes to practice"
                  >
                    {shownActive.map((p) => {
                      const progress = Math.min(p.similarCorrectCount, masteryThreshold);
                      return (
                        <li key={p.id} className="fact-list__item fact-list__item--detail">
                          <span className="fact-list__fact">{factText(p)}</span>
                          <span className="fact-list__meta">
                            missed {times(p.incorrectCount)}, last on{' '}
                            {formatSessionDate(p.lastIncorrectAt)}
                          </span>
                          <span className="fact-list__progress">
                            <span className="meter" aria-hidden="true">
                              <span
                                className="meter__fill"
                                style={{ width: `${(progress / masteryThreshold) * 100}%` }}
                              />
                            </span>
                            <span>
                              {progress} of {masteryThreshold} correct to master
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {active.length > MISTAKES_SHOWN_AT_FIRST && (
                    <Button
                      variant="secondary"
                      className="show-more"
                      aria-controls="mistakes-to-practice"
                      aria-expanded={showAllActive}
                      onClick={() => setShowAllActive((v) => !v)}
                    >
                      {showAllActive
                        ? 'Show fewer'
                        : `Show all ${active.length} mistakes to practice`}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {mastered.length > 0 && (
            <details
              className="mastered-list"
              onToggle={(e) => setMasteredOpen(e.currentTarget.open)}
            >
              <summary>Mastered mistakes ({mastered.length})</summary>
              <ul className="fact-list" aria-label="Mastered mistakes">
                {/* Only built when opened: there can be hundreds. */}
                {masteredOpen &&
                  mastered.map((p) => (
                    <li key={p.id} className="fact-list__item">
                      <span className="fact-list__fact">
                        <span aria-hidden="true">🏅 </span>
                        {factText(p)}
                      </span>
                      <span className="fact-list__meta">
                        missed {times(p.incorrectCount)} before
                      </span>
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
});
