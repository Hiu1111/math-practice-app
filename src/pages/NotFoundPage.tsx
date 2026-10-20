import { ButtonLink } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';

export function NotFoundPage() {
  return (
    <PageContainer title="Page Not Found" width="narrow">
      <EmptyState
        icon="🧭"
        title="Oops! This page got lost."
        action={<ButtonLink to="/">Go Home</ButtonLink>}
      >
        <p>We couldn&apos;t find the page you were looking for.</p>
      </EmptyState>
    </PageContainer>
  );
}
