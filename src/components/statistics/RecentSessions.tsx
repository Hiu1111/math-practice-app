import { memo, useMemo } from 'react';
import { calculateAccuracy, recentSessions } from '../../services/statisticsService';
import type { PracticeSession } from '../../types';
import { DIFFICULTY_INFO, describeOperations, formatSessionDate } from '../../utils/operations';

/**
 * Recent sessions, newest first (spec 6.6, recent activity). A real table on
 * wide screens; each row becomes a stacked card on small screens (spec 15).
 */
export const RecentSessions = memo(function RecentSessions({
  sessions,
}: {
  sessions: readonly PracticeSession[];
}) {
  const recent = useMemo(() => recentSessions(sessions, 10), [sessions]);

  return (
    <section className="stats-section card" aria-labelledby="stats-recent">
      <h2 id="stats-recent" className="stats-section__title">
        Recent sessions
      </h2>
      {recent.length === 0 ? (
        <p className="stats-section__empty">No sessions yet. Finish a practice to see it here.</p>
      ) : (
        <table className="sessions-table">
          <caption className="visually-hidden">Recent practice sessions, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Practiced</th>
              <th scope="col">Level</th>
              <th scope="col">Questions</th>
              <th scope="col">Correct</th>
              <th scope="col">Incorrect</th>
              <th scope="col">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => (
              <tr key={s.id}>
                <th scope="row" data-label="Date">
                  {formatSessionDate(s.completedAt ?? s.startedAt)}
                  {!s.completedAt && <span className="sessions-table__tag">not finished</span>}
                </th>
                <td data-label="Practiced">{describeOperations(s.operations)}</td>
                <td data-label="Level">
                  {s.difficulty} · {DIFFICULTY_INFO[s.difficulty].name}
                </td>
                <td data-label="Questions">{s.attempted}</td>
                <td data-label="Correct">{s.correct}</td>
                <td data-label="Incorrect">{s.incorrect}</td>
                <td data-label="Accuracy">{calculateAccuracy(s.correct, s.attempted)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
});
