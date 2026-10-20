import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { generateQuestionForOperations } from '../services/questionGenerator';
import { QuestionCard } from '../components/practice/QuestionCard';
import { DEFAULT_SETTINGS, type Question, type SessionConfig } from '../types';
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
      <QuestionPreview config={config} />
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

/**
 * Phase 6: shows the interactive card and moves to a new question after each
 * self-report. Phase 7 replaces this with a tracked practice session.
 */
function QuestionPreview({ config }: { config: SessionConfig }) {
  const [question, setQuestion] = useState<Question>(() =>
    generateQuestionForOperations(config.operations, config.difficulty),
  );
  const [questionNumber, setQuestionNumber] = useState(1);

  const next = () => {
    setQuestion((previous) =>
      generateQuestionForOperations(config.operations, config.difficulty, { avoid: previous }),
    );
    setQuestionNumber((n) => n + 1);
  };

  return (
    <QuestionCard
      key={question.id}
      question={question}
      questionNumber={questionNumber}
      totalQuestions={config.sessionLength === 'continuous' ? null : config.sessionLength}
      animate={DEFAULT_SETTINGS.cardAnimation}
      showExplanation={DEFAULT_SETTINGS.showExplanations}
      autoFocus={questionNumber > 1}
      onResult={next}
    />
  );
}
