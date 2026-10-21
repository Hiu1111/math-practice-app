import { useState } from 'react';
import { Button, ButtonLink } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';
import { DifficultyStatistics } from '../components/statistics/DifficultyStatistics';
import { MistakeStatistics } from '../components/statistics/MistakeStatistics';
import { OperationStatistics } from '../components/statistics/OperationStatistics';
import { RecentSessions } from '../components/statistics/RecentSessions';
import { StatisticsOverview } from '../components/statistics/StatisticsOverview';
import { useAppData, useAppStore } from '../hooks/useAppData';

/** The exact confirmation wording from spec 6.6. */
export const RESET_CONFIRMATION =
  'Are you sure you want to erase all practice history and statistics?';

export function StatisticsPage() {
  const store = useAppStore();
  const statistics = useAppData((s) => s.statistics);
  const sessions = useAppData((s) => s.sessions);
  const mistakePatterns = useAppData((s) => s.mistakePatterns);
  const masteryThreshold = useAppData((s) => s.settings.masteryThreshold);
  const [confirming, setConfirming] = useState(false);
  const [justReset, setJustReset] = useState(false);

  const hasData = statistics.attempted > 0 || sessions.length > 0 || mistakePatterns.length > 0;

  if (!hasData) {
    return (
      <PageContainer title="Statistics" width="narrow">
        {justReset && (
          <p className="notice" role="status">
            Your practice history and statistics have been erased.
          </p>
        )}
        <EmptyState
          icon="📊"
          title="No practice yet"
          action={<ButtonLink to="/practice/setup">Start Practice</ButtonLink>}
        >
          <p>Your scores will show up here after you practice.</p>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Statistics" subtitle="See how your practice is going." width="wide">
      <div className="stats-layout">
        <StatisticsOverview totals={statistics} />
        <OperationStatistics statistics={statistics} />
        <DifficultyStatistics statistics={statistics} />
        <MistakeStatistics
          patterns={mistakePatterns}
          statistics={statistics}
          masteryThreshold={masteryThreshold}
        />
        <RecentSessions sessions={sessions} />

        <section className="stats-reset" aria-labelledby="stats-reset-title">
          <h2 id="stats-reset-title" className="visually-hidden">
            Reset
          </h2>
          <p>
            Starting over? This erases your practice history, statistics and saved mistakes.
            Settings are kept.
          </p>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Reset Statistics
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Reset statistics?"
        message={
          <>
            <p>{RESET_CONFIRMATION}</p>
            <p className="dialog__small">This cannot be undone. Your settings will be kept.</p>
          </>
        }
        confirmLabel="Yes, erase it"
        cancelLabel="Keep my statistics"
        confirmVariant="danger"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          store.resetStatistics();
          setJustReset(true);
        }}
      />
    </PageContainer>
  );
}
