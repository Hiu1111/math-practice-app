import { ButtonLink } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';

/** Placeholder until Phase 3 passes a session configuration here. */
export function PracticePage() {
  return (
    <PageContainer title="Practice" width="narrow">
      <EmptyState
        icon="✏️"
        title="Practice cards are coming soon"
        action={<ButtonLink to="/practice/setup">Back to Setup</ButtonLink>}
      />
    </PageContainer>
  );
}
