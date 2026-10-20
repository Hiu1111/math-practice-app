import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageContainer } from '../components/layout/PageContainer';
import { ProgressBar } from '../components/practice/ProgressBar';
import { QuestionCard } from '../components/practice/QuestionCard';
import { sessionTotal, usePracticeSession } from '../hooks/usePracticeSession';
import { DEFAULT_SETTINGS, type PracticeSession, type SessionConfig } from '../types';
import { pickFeedback } from '../utils/feedback';
import { DIFFICULTY_INFO, describeOperations } from '../utils/operations';
import { isValidSessionConfig } from '../utils/validation';
import type { SetupLocationState } from './PracticeSetupPage';

export interface PracticeLocationState {
  config?: unknown;
}

export interface SummaryLocationState {
  session?: unknown;
}

export function PracticePage() {
  const location = useLocation();
  const config = (location.state as PracticeLocationState | null)?.config;

  // Arriving here without a valid setup (typed URL, bookmark) goes back to the setup page.
  if (!isValidSessionConfig(config)) {
    const state: SetupLocationState = { notice: 'missing-session' };
    return <Navigate to="/practice/setup" replace state={state} />;
  }

  // A new navigation (e.g. "Practice Again") gets a fresh session via a new key.
  return <PracticeSessionView key={location.key} config={config} />;
}

function PracticeSessionView({ config }: { config: SessionConfig }) {
  const navigate = useNavigate();
  const { state, recordResult, endSession } = usePracticeSession(config);
  const { session, currentQuestion, currentQuestionIndex, status } = state;
  const [feedback, setFeedback] = useState('');
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const navigatedRef = useRef(false);

  const total = sessionTotal(session);
  const settings = DEFAULT_SETTINGS; // Replaced by saved settings in Phase 11.

  // When the session finishes, show the summary (or go back to setup if nothing was answered).
  useEffect(() => {
    if (status !== 'complete' || navigatedRef.current) return;
    navigatedRef.current = true;
    if (session.attempted === 0) {
      const setupState: SetupLocationState = { config };
      navigate('/practice/setup', { replace: true, state: setupState });
    } else {
      const summaryState: SummaryLocationState = { session };
      navigate('/practice/summary', { replace: true, state: summaryState });
    }
  }, [status, session, config, navigate]);

  const handleResult = (selectedAnswer: number, correct: boolean) => {
    if (settings.feedbackMessages) setFeedback((previous) => pickFeedback(correct, previous));
    recordResult(selectedAnswer, correct);
  };

  const handleEndClick = () => {
    // Nothing answered yet: no summary to show, so leave without asking.
    if (session.attempted === 0) endSession();
    else setConfirmingEnd(true);
  };

  return (
    <PageContainer title="Practice" hideTitle width="narrow">
      <SessionHeader session={session} total={total} />
      <p className="feedback" aria-live="polite">
        {feedback}
      </p>

      {status === 'active' && (
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={total}
          animate={settings.cardAnimation}
          showExplanation={settings.showExplanations}
          autoFocus={currentQuestionIndex > 0}
          onResult={handleResult}
        />
      )}

      {total === null && (
        <div className="session-actions">
          <Button variant="secondary" onClick={handleEndClick}>
            <span aria-hidden="true">🏁</span> End Session
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingEnd}
        title="End this session?"
        message={
          <p>
            You answered {session.attempted} {session.attempted === 1 ? 'question' : 'questions'}.
            End now to see how you did?
          </p>
        }
        confirmLabel="End Session"
        cancelLabel="Keep Practicing"
        onCancel={() => setConfirmingEnd(false)}
        onConfirm={() => {
          setConfirmingEnd(false);
          endSession();
        }}
      />
    </PageContainer>
  );
}

function SessionHeader({ session, total }: { session: PracticeSession; total: number | null }) {
  return (
    <div className="session-header">
      <ul className="config-chips" aria-label="Session settings">
        <li className="chip">{describeOperations(session.operations)}</li>
        <li className="chip">
          Level {session.difficulty} · {DIFFICULTY_INFO[session.difficulty].name}
        </li>
      </ul>
      {total !== null ? (
        <ProgressBar answered={session.attempted} total={total} />
      ) : (
        <p className="session-header__continuous">
          Keep going as long as you like. Press <strong>End Session</strong> when you are done.
        </p>
      )}
      <ul className="tally" aria-label="Score so far">
        <li className="tally__item tally__item--right">
          <span aria-hidden="true">✓</span> Right: {session.correct}
        </li>
        <li className="tally__item tally__item--wrong">
          <span aria-hidden="true">↻</span> To practice: {session.incorrect}
        </li>
      </ul>
    </div>
  );
}
