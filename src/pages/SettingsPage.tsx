import { ButtonLink } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';

/** Placeholder until Phase 11 builds the settings page. */
export function SettingsPage() {
  return (
    <PageContainer title="Settings" width="narrow">
      <EmptyState
        icon="⚙️"
        title="Settings are coming soon"
        action={<ButtonLink to="/">Go Home</ButtonLink>}
      >
        <p>Soon you&apos;ll be able to choose your favorite practice options here.</p>
      </EmptyState>
    </PageContainer>
  );
}
