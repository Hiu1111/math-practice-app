import { ButtonLink } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';

/** Placeholder until Phase 10 builds the statistics page. */
export function StatisticsPage() {
  return (
    <PageContainer title="Statistics" width="narrow">
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
