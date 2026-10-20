import { Navigate, useLocation } from 'react-router-dom';
import { ButtonLink } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';
import type { SessionConfig } from '../types';
import { DIFFICULTY_INFO, describeOperations } from '../utils/operations';
import { isValidSessionConfig } from '../utils/validation';
import type { SetupLocationState } from './PracticeSetupPage';

export interface PracticeLocationState {
  config?: unknown;
}

export function PracticePage() {
  const location = useLocation();
  const config = (location.state as PracticeLocationState | null)?.config;

  // Arriving here without a valid setup (typed URL, bookmark) goes back to the setup page.
  if (!isValidSessionConfig(config)) {
    const state: SetupLocationState = { notice: 'missing-session' };
    return <Navigate to="/practice/setup" replace state={state} />;
  }

  return (
    <PageContainer title="Practice" width="narrow">
      <SessionDetails config={config} />
      <div className="card preview-card">
        <p>Question cards arrive in the next phase.</p>
        <ButtonLink to="/practice/setup" variant="secondary">
          Change Settings
        </ButtonLink>
      </div>
    </PageContainer>
  );
}

function SessionDetails({ config }: { config: SessionConfig }) {
  return (
    <ul className="config-chips" aria-label="Session settings">
      <li className="chip">{describeOperations(config.operations)}</li>
      <li className="chip">
        Level {config.difficulty} · {DIFFICULTY_INFO[config.difficulty].name}
      </li>
      <li className="chip">
        {config.sessionLength === 'continuous' ? 'Keep going' : `${config.sessionLength} questions`}
      </li>
    </ul>
  );
}
