import { useEffect, useRef, useState } from 'react';
import { Navigate, useBlocker, useLocation, useNavigate } from 'react-router';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageContainer } from '../components/layout/PageContainer';
import { ProgressBar } from '../components/practice/ProgressBar';
import { QuestionCard } from '../components/practice/QuestionCard';
import { sessionTotal, usePracticeSession } from '../hooks/usePracticeSession';
import { useAppData, useAppStore } from '../hooks/useAppData';
import type { PracticeSession, SessionConfig } from '../types';
import { pickFeedback } from '../utils/feedback';
import { playResultSound } from '../utils/sound';
import { DIFFICULTY_INFO, describeOperations } from '../utils/operations';
import { isValidSessionConfig } from '../utils/validation';
import { reviewablePatterns } from '../services/mistakeService';
import { nextReviewQuestion } from '../services/similarQuestionGenerator';
import {
  clearActiveSession,
  loadActiveSession,
  saveActiveSession,
  type ActiveSessionSnapshot,
  type CardSnapshot,
} from '../services/activeSessionService';
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
  // A page refresh keeps the same key, which is how a saved session is found again.
  return <SessionStart key={location.key} routeKey={location.key} config={config} />;
}

/**
 * Decides, once, how this visit of the session page starts:
 * - resume the session saved for this visit (after a page refresh), or
 * - start a new one; a mistake-review session needs at least one mistake.
 * This must not be re-checked during the session: mastering the last mistake
 * mid-session is a normal ending that should show the summary.
 */
function SessionStart({ routeKey, config }: { routeKey: string; config: SessionConfig }) {
  const store = useAppStore();
  const [start] = useState(() => {
    const restored = loadActiveSession(routeKey, config);
    if (restored) return { canStart: true, restored };
    if (config.reviewMode !== 'mistake-review') return { canStart: true, restored: null };
    const { mistakePatterns, settings } = store.getState();
    const canStart =
      reviewablePatterns(mistakePatterns, config, settings.masteryThreshold).length > 0;
    return { canStart, restored: null };
  });

  if (!start.canStart) {
    const state: SetupLocationState = { notice: 'no-mistakes', config };
    return <Navigate to="/practice/setup" replace state={state} />;
  }
  return <PracticeSessionView routeKey={routeKey} config={config} restored={start.restored} />;
}

interface PracticeSessionViewProps {
  routeKey: string;
  config: SessionConfig;
  restored: ActiveSessionSnapshot | null;
}

function PracticeSessionView({ routeKey, config, restored }: PracticeSessionViewProps) {
  const navigate = useNavigate();
  const store = useAppStore();
  const settings = useAppData((s) => s.settings);
  const { state, recordResult, endSession } = usePracticeSession(config, {
    initialState: restored?.state ?? null,
    // Every counted answer is saved right away (spec 6.3), with the session's totals.
    onAttemptRecorded: store.recordAttempt,
    onSessionEnded: store.saveSession,
    // Review sessions read the latest saved mistakes each time, so a mistake mastered
    // by the last answer is not asked again.
    generateNextQuestion:
      config.reviewMode === 'mistake-review'
        ? (previous) => {
            const { mistakePatterns, settings: current } = store.getState();
            return nextReviewQuestion(mistakePatterns, config, current.masteryThreshold, previous);
          }
        : undefined,
  });
  const { session, currentQuestion, currentQuestionIndex, status } = state;
  // Each new message gets a new id, so its "pop" animation plays again.
  const [feedback, setFeedback] = useState({ text: '', id: 0 });
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const navigatedRef = useRef(false);

  const total = sessionTotal(session);

  // ------------------------------------------------------------------
  // Session recovery (TODO task 74): save where the student is, so a page
  // refresh comes back to the same question, answer and card side.
  // ------------------------------------------------------------------
  const cardRef = useRef<CardSnapshot>(
    restored?.card ?? { questionId: currentQuestion.id, selectedAnswer: null, flipped: false },
  );

  useEffect(() => {
    if (status !== 'active') {
      clearActiveSession();
      return;
    }
    if (cardRef.current.questionId !== currentQuestion.id) {
      cardRef.current = { questionId: currentQuestion.id, selectedAnswer: null, flipped: false };
    }
    saveActiveSession({ routeKey, config, state, card: cardRef.current });
  }, [routeKey, config, state, status, currentQuestion.id]);

  const handleCardStateChange = (selectedAnswer: number | null, flipped: boolean) => {
    cardRef.current = { questionId: currentQuestion.id, selectedAnswer, flipped };
    saveActiveSession({ routeKey, config, state, card: cardRef.current });
  };

  // ------------------------------------------------------------------
  // Navigation safety (TODO task 75): ask before leaving a session that has
  // answers in it. Never after it is complete, and not for its own navigation
  // to the summary.
  // ------------------------------------------------------------------
  const hasProgress = status === 'active' && session.attempted > 0;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasProgress && !navigatedRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // Closing the tab or typing a new address: the browser shows its own prompt.
  useEffect(() => {
    if (!hasProgress) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasProgress]);

  const leaveSession = () => {
    // End the session properly (totals and end time saved), then go where the student asked.
    navigatedRef.current = true;
    endSession();
    clearActiveSession();
    blocker.proceed?.();
  };

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
    if (settings.feedbackMessages) {
      setFeedback((previous) => ({
        text: pickFeedback(correct, previous.text),
        id: previous.id + 1,
      }));
    }
    if (settings.soundEffects) playResultSound(correct);
    recordResult(selectedAnswer, correct);
  };

  const handleEndClick = () => {
    // Nothing answered yet: no summary to show, so leave without asking.
    if (session.attempted === 0) endSession();
    else setConfirmingEnd(true);
  };

  return (
    <PageContainer title="Practice" hideTitle width="narrow">
      {restored && (
        <p className="notice" role="status">
          Welcome back! You are on question {restored.state.currentQuestionIndex + 1}, right where
          you left off.
        </p>
      )}
      <SessionHeader session={session} total={total} />
      {/* The live region stays mounted; only the inner text is replaced, so it is announced. */}
      <p className="feedback" aria-live="polite">
        {feedback.text && (
          <span key={feedback.id} className="feedback__text">
            {feedback.text}
          </span>
        )}
      </p>

      {status === 'active' && (
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={total}
          animate={settings.cardAnimation}
          showExplanation={settings.showExplanations}
          autoFocus={currentQuestionIndex > 0 || restored !== null}
          onResult={handleResult}
          onCardStateChange={handleCardStateChange}
          initialSelectedAnswer={
            restored?.card.questionId === currentQuestion.id ? restored.card.selectedAnswer : null
          }
          initialFlipped={
            restored?.card.questionId === currentQuestion.id ? restored.card.flipped : false
          }
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

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Leave this session?"
        message={
          <p>
            You answered {session.attempted} {session.attempted === 1 ? 'question' : 'questions'}.
            Your answers so far are saved. Leaving ends this session.
          </p>
        }
        confirmLabel="Leave Session"
        cancelLabel="Keep Practicing"
        onCancel={() => blocker.reset?.()}
        onConfirm={leaveSession}
      />
    </PageContainer>
  );
}

function SessionHeader({ session, total }: { session: PracticeSession; total: number | null }) {
  return (
    <div className="session-header">
      <ul className="config-chips" aria-label="Session settings">
        {session.reviewMode === 'mistake-review' && (
          <li className="chip chip--review">
            <span aria-hidden="true">🎯 </span>Mistake practice
          </li>
        )}
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
