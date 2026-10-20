import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';
import { DifficultySelector } from '../components/practice/DifficultySelector';
import { OperationSelector } from '../components/practice/OperationSelector';
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector';
import { useAppData } from '../hooks/useAppData';
import {
  type DifficultyLevel,
  type MathOperation,
  type SessionConfig,
  type SessionLength,
} from '../types';
import { isValidSessionConfig } from '../utils/validation';

export interface SetupLocationState {
  notice?: 'missing-session';
  /** Previous choices to start from (e.g. after "Change Settings"). */
  config?: SessionConfig;
}

export function PracticeSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as SetupLocationState | null;
  const notice = locationState?.notice;
  const previous = isValidSessionConfig(locationState?.config) ? locationState.config : null;
  // Start from the previous session's choices if there are any, otherwise the saved defaults.
  // Changes here apply to this session only; they do not change the saved defaults.
  const { settings } = useAppData();

  const [operations, setOperations] = useState<MathOperation[]>(() => [
    ...(previous?.operations ?? settings.defaultOperations),
  ]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    previous?.difficulty ?? settings.defaultDifficulty,
  );
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    previous?.sessionLength ?? settings.defaultSessionLength,
  );

  const canStart = operations.length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canStart) return;
    const config: SessionConfig = { operations, difficulty, sessionLength, reviewMode: 'regular' };
    navigate('/practice/session', { state: { config } });
  };

  return (
    <PageContainer title="Get Ready!" subtitle="Set up your practice in three quick steps.">
      {notice === 'missing-session' && (
        <p className="notice" role="status">
          Let&apos;s set up a practice session first.
        </p>
      )}
      <form className="setup-form" onSubmit={handleSubmit} noValidate>
        <OperationSelector step={1} selected={operations} onChange={setOperations} />
        <DifficultySelector step={2} value={difficulty} onChange={setDifficulty} />
        <SessionLengthSelector step={3} value={sessionLength} onChange={setSessionLength} />

        <div className="setup-form__footer">
          <p
            id="start-session-message"
            className={canStart ? 'visually-hidden' : 'form-message'}
            aria-live="polite"
          >
            {canStart ? '' : 'Pick at least one kind of math to start.'}
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={!canStart}
            aria-describedby="start-session-message"
          >
            Start Session <span aria-hidden="true">▶</span>
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
