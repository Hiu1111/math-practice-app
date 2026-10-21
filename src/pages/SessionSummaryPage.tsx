import { useLocation } from 'react-router';
import { ButtonLink } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';
import { SessionSummary } from '../components/practice/SessionSummary';
import { isCompletedSession } from '../utils/validation';
import type { SummaryLocationState } from './PracticePage';

export function SessionSummaryPage() {
  const location = useLocation();
  const session = (location.state as SummaryLocationState | null)?.session;

  if (!isCompletedSession(session)) {
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

  return (
    <PageContainer title="Session Complete!" width="narrow">
      <SessionSummary session={session} />
    </PageContainer>
  );
}
