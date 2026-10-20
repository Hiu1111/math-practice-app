import { ButtonLink } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';

/** Placeholder until Phase 8 builds the real session summary. */
export function SessionSummaryPage() {
  return (
    <PageContainer title="Session Summary" width="narrow">
      <EmptyState
        icon="🏁"
        title="No summary yet"
        action={<ButtonLink to="/practice/setup">Start Practice</ButtonLink>}
      >
        <p>Finish a practice session to see how you did.</p>
      </EmptyState>
    </PageContainer>
  );
}
