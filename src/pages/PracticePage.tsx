import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button, ButtonLink } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';
import { generateQuestionForOperations } from '../services/questionGenerator';
import type { Question, SessionConfig } from '../types';
import {
  DIFFICULTY_INFO,
  describeOperations,
  formatNumber,
  speakQuestion,
} from '../utils/operations';
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
 * Temporary preview of generated questions (Phases 4–5).
 * Phase 6 replaces this with the interactive flip card.
 */
function QuestionPreview({ config }: { config: SessionConfig }) {
  const [question, setQuestion] = useState<Question>(() =>
    generateQuestionForOperations(config.operations, config.difficulty),
  );
  const [showAnswer, setShowAnswer] = useState(false);

  const next = () => {
    setQuestion((previous) =>
      generateQuestionForOperations(config.operations, config.difficulty, { avoid: previous }),
    );
    setShowAnswer(false);
  };

  return (
    <section className="card preview-card" aria-labelledby="preview-question">
      <p className="preview-note">
        Preview: the flip cards arrive in the next step. Check the questions and choices here.
      </p>
      <h2
        id="preview-question"
        className="math-question"
        aria-label={speakQuestion(
          question.operation,
          question.firstOperand,
          question.secondOperand,
        )}
      >
        {question.displayText} = ?
      </h2>
      <ul className="choice-preview" aria-label="Answer choices">
        {question.choices.map((choice) => {
          const isAnswer = showAnswer && choice === question.correctAnswer;
          return (
            <li key={choice} className={isAnswer ? 'is-correct' : undefined}>
              {formatNumber(choice)}
              {isAnswer && <span className="choice-preview__tag"> ✓ answer</span>}
            </li>
          );
        })}
      </ul>
      <div className="preview-actions">
        <Button variant="secondary" onClick={() => setShowAnswer((s) => !s)}>
          {showAnswer ? 'Hide answer' : 'Show answer'}
        </Button>
        <Button onClick={next}>Next question</Button>
      </div>
      <ButtonLink to="/practice/setup" variant="ghost">
        Change Settings
      </ButtonLink>
    </section>
  );
}
