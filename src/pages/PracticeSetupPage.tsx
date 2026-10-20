import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';
import { DifficultySelector } from '../components/practice/DifficultySelector';
import { OperationSelector } from '../components/practice/OperationSelector';
import { ReviewModeSelector } from '../components/practice/ReviewModeSelector';
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector';
import { useAppData } from '../hooks/useAppData';
import { activePatterns, reviewablePatterns } from '../services/mistakeService';
import {
  type DifficultyLevel,
  type MathOperation,
  type ReviewMode,
  type SessionConfig,
  type SessionLength,
} from '../types';
import { isValidSessionConfig } from '../utils/validation';

export interface SetupLocationState {
  /** missing-session: arrived at the practice page without a setup.
   *  no-mistakes: asked to review mistakes, but none are left for those choices. */
  notice?: 'missing-session' | 'no-mistakes';
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
  const { settings, mistakePatterns } = useAppData();

  const [operations, setOperations] = useState<MathOperation[]>(() => [
    ...(previous?.operations ?? settings.defaultOperations),
  ]);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    previous?.difficulty ?? settings.defaultDifficulty,
  );
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    previous?.sessionLength ?? settings.defaultSessionLength,
  );
  const [reviewMode, setReviewMode] = useState<ReviewMode>(
    notice === 'no-mistakes' ? 'regular' : (previous?.reviewMode ?? 'regular'),
  );

  const reviewableCount = reviewablePatterns(
    mistakePatterns,
    { operations, difficulty },
    settings.masteryThreshold,
  ).length;
  const totalActive = activePatterns(mistakePatterns, settings.masteryThreshold).length;

  let blocker = '';
  if (operations.length === 0) blocker = 'Pick at least one kind of math to start.';
  else if (reviewMode === 'mistake-review' && reviewableCount === 0) {
    blocker = 'There are no mistakes to practice for this math and level. Try regular practice.';
  }
  const canStart = blocker === '';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canStart) return;
    const config: SessionConfig = { operations, difficulty, sessionLength, reviewMode };
    navigate('/practice/session', { state: { config } });
  };

  return (
    <PageContainer title="Get Ready!" subtitle="Set up your practice in four quick steps.">
      {notice === 'missing-session' && (
        <p className="notice" role="status">
          Let&apos;s set up a practice session first.
        </p>
      )}
      {notice === 'no-mistakes' && (
        <p className="notice" role="status">
          You have no mistakes left to practice for those choices. Great work!
        </p>
      )}
      <form className="setup-form" onSubmit={handleSubmit} noValidate>
        <OperationSelector step={1} selected={operations} onChange={setOperations} />
        <DifficultySelector step={2} value={difficulty} onChange={setDifficulty} />
        <SessionLengthSelector step={3} value={sessionLength} onChange={setSessionLength} />
        <ReviewModeSelector
          step={4}
          value={reviewMode}
          onChange={setReviewMode}
          reviewableCount={reviewableCount}
          totalActive={totalActive}
        />

        <div className="setup-form__footer">
          <p
            id="start-session-message"
            className={canStart ? 'visually-hidden' : 'form-message'}
            aria-live="polite"
          >
            {blocker}
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
