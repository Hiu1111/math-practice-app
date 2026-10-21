import { useEffect, useRef } from 'react';
import type { PracticeLocationState } from '../../pages/PracticePage';
import type { SetupLocationState } from '../../pages/PracticeSetupPage';
import { useAppData } from '../../hooks/useAppData';
import { reviewablePatterns } from '../../services/mistakeService';
import { calculateAccuracy } from '../../services/statisticsService';
import type { PracticeSession, SessionConfig } from '../../types';
import { summaryMessage } from '../../utils/feedback';
import { DIFFICULTY_INFO, describeOperations } from '../../utils/operations';
import { Button, ButtonLink } from '../common/Button';

interface SessionSummaryProps {
  session: PracticeSession;
}

/** The results of a finished session and what to do next (spec 6.5). */
export function SessionSummary({ session }: SessionSummaryProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const accuracy = calculateAccuracy(session.correct, session.attempted);
  const message = summaryMessage(accuracy);

  const config: SessionConfig = {
    operations: session.operations,
    difficulty: session.difficulty,
    sessionLength: session.sessionLength,
    reviewMode: session.reviewMode,
  };
  const practiceAgain: PracticeLocationState = { config };
  const changeSettings: SetupLocationState = { config };
  const practiceMistakes: PracticeLocationState = {
    config: { ...config, reviewMode: 'mistake-review' },
  };

  const mistakePatterns = useAppData((s) => s.mistakePatterns);
  const settings = useAppData((s) => s.settings);
  const mistakesToPractice = reviewablePatterns(
    mistakePatterns,
    config,
    settings.masteryThreshold,
  ).length;
  let mistakesNote: string;
  if (mistakesToPractice > 0) {
    mistakesNote = `${mistakesToPractice} ${mistakesToPractice === 1 ? 'mistake' : 'mistakes'} ready to practice.`;
  } else if (session.reviewMode === 'mistake-review') {
    mistakesNote = 'You mastered every mistake for this math and level!';
  } else {
    mistakesNote = 'No mistakes to practice. Great job!';
  }

  // Announce the result when the summary appears.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="summary card" aria-labelledby="summary-message">
      <div className="summary__emoji" aria-hidden="true">
        {message.emoji}
      </div>
      <h2 id="summary-message" ref={headingRef} tabIndex={-1} className="summary__message">
        {message.text}
      </h2>

      <dl className="stat-grid" aria-label="Results">
        <div className="stat-tile">
          <dt>Questions</dt>
          <dd>{session.attempted}</dd>
        </div>
        <div className="stat-tile stat-tile--correct">
          <dt>
            <span aria-hidden="true">✓ </span>Correct
          </dt>
          <dd>{session.correct}</dd>
        </div>
        <div className="stat-tile stat-tile--incorrect">
          <dt>
            <span aria-hidden="true">↻ </span>Incorrect
          </dt>
          <dd>{session.incorrect}</dd>
        </div>
        <div className="stat-tile stat-tile--accuracy">
          <dt>Accuracy</dt>
          <dd>{accuracy}%</dd>
        </div>
      </dl>

      <dl className="summary-details" aria-label="Session details">
        <div>
          <dt>Practice</dt>
          <dd>{session.reviewMode === 'mistake-review' ? 'Mistake practice' : 'Regular'}</dd>
        </div>
        <div>
          <dt>Practiced</dt>
          <dd>{describeOperations(session.operations)}</dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>
            Level {session.difficulty} · {DIFFICULTY_INFO[session.difficulty].name}
          </dd>
        </div>
        <div>
          <dt>Mistake-review questions</dt>
          <dd>{session.reviewQuestionsCompleted}</dd>
        </div>
      </dl>

      <div className="summary-actions">
        <ButtonLink to="/practice/session" state={practiceAgain} size="lg" block>
          <span aria-hidden="true">🔁</span> Practice Again
        </ButtonLink>
        {mistakesToPractice > 0 ? (
          <ButtonLink
            to="/practice/session"
            state={practiceMistakes}
            variant="secondary"
            block
            aria-describedby="practice-mistakes-note"
          >
            <span aria-hidden="true">🎯</span> Practice Mistakes
          </ButtonLink>
        ) : (
          <Button variant="secondary" block disabled aria-describedby="practice-mistakes-note">
            <span aria-hidden="true">🎯</span> Practice Mistakes
          </Button>
        )}
        <p id="practice-mistakes-note" className="summary-actions__note">
          {mistakesNote}
        </p>
        <div className="summary-actions__row">
          <ButtonLink to="/practice/setup" state={changeSettings} variant="secondary" block>
            <span aria-hidden="true">⚙️</span> Change Settings
          </ButtonLink>
          <ButtonLink to="/statistics" variant="secondary" block>
            <span aria-hidden="true">📊</span> View Statistics
          </ButtonLink>
        </div>
        <ButtonLink to="/" variant="ghost" block>
          <span aria-hidden="true">🏠</span> Return Home
        </ButtonLink>
      </div>
    </section>
  );
}
