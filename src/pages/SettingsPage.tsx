import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Toggle } from '../components/common/Toggle';
import { PageContainer } from '../components/layout/PageContainer';
import { DifficultySelector } from '../components/practice/DifficultySelector';
import { OperationSelector } from '../components/practice/OperationSelector';
import { SessionLengthSelector } from '../components/practice/SessionLengthSelector';
import { useAppData, useAppStore } from '../hooks/useAppData';
import {
  MAX_MASTERY_THRESHOLD,
  MIN_MASTERY_THRESHOLD,
  type AppSettings,
  type MathOperation,
} from '../types';

export interface HomeLocationState {
  notice?: 'data-cleared';
}

const THRESHOLD_OPTIONS = Array.from(
  { length: MAX_MASTERY_THRESHOLD - MIN_MASTERY_THRESHOLD + 1 },
  (_, i) => MIN_MASTERY_THRESHOLD + i,
);

/** Application-wide preferences (spec 6.7). Changes are saved automatically. */
export function SettingsPage() {
  const store = useAppStore();
  const navigate = useNavigate();
  const settings = useAppData((s) => s.settings);
  const [savedMessage, setSavedMessage] = useState('');
  const [operationsMessage, setOperationsMessage] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const thresholdId = useId();
  const thresholdHelpId = useId();

  const save = (changes: Partial<AppSettings>) => {
    store.updateSettings(changes);
    setSavedMessage('Saved!');
  };

  const changeOperations = (operations: MathOperation[]) => {
    if (operations.length === 0) {
      setOperationsMessage('Keep at least one kind of math selected.');
      return;
    }
    setOperationsMessage('');
    save({ defaultOperations: operations });
  };

  return (
    <PageContainer
      title="Settings"
      subtitle="Changes are saved automatically on this device."
      width="normal"
    >
      <p className="settings-saved" aria-live="polite">
        {savedMessage && (
          <>
            <span aria-hidden="true">✓ </span>
            {savedMessage}
          </>
        )}
      </p>

      <div className="settings-layout">
        <section className="settings-section" aria-labelledby="settings-defaults">
          <h2 id="settings-defaults" className="settings-section__title">
            Practice defaults
          </h2>
          <p className="settings-section__intro">
            These are already chosen when you open the practice setup. You can still change them for
            any session.
          </p>
          <OperationSelector
            legend="Default math"
            hint="Choose one or more."
            selected={settings.defaultOperations}
            onChange={changeOperations}
          />
          {operationsMessage && (
            <p className="form-message settings-error" role="alert">
              {operationsMessage}
            </p>
          )}
          <DifficultySelector
            legend="Default level"
            value={settings.defaultDifficulty}
            onChange={(level) => save({ defaultDifficulty: level })}
          />
          <SessionLengthSelector
            legend="Default number of questions"
            value={settings.defaultSessionLength}
            onChange={(length) => save({ defaultSessionLength: length })}
          />
        </section>

        <section className="settings-section card" aria-labelledby="settings-cards">
          <h2 id="settings-cards" className="settings-section__title">
            Cards and feedback
          </h2>
          <Toggle
            label="Card animation"
            description="Flip the card with a 3D animation. Turn off for an instant swap."
            checked={settings.cardAnimation}
            onChange={(on) => save({ cardAnimation: on })}
          />
          <Toggle
            label="Show explanations"
            description="Show a short tip on the back of each card."
            checked={settings.showExplanations}
            onChange={(on) => save({ showExplanations: on })}
          />
          <Toggle
            label="Encouraging messages"
            description='Show messages like "Great job!" after each answer.'
            checked={settings.feedbackMessages}
            onChange={(on) => save({ feedbackMessages: on })}
          />
          <Toggle
            label="Sound effects"
            description="Play a short chime after each answer."
            checked={settings.soundEffects}
            onChange={(on) => save({ soundEffects: on })}
          />
        </section>

        <section className="settings-section card" aria-labelledby="settings-mistakes">
          <h2 id="settings-mistakes" className="settings-section__title">
            Mistake practice
          </h2>
          <div className="settings-field">
            <label htmlFor={thresholdId} className="toggle-row__label">
              Correct answers needed to master a mistake
            </label>
            <p id={thresholdHelpId} className="toggle-row__description">
              After a mistake, similar questions come back until you get this many right.
            </p>
            <select
              id={thresholdId}
              className="select"
              aria-describedby={thresholdHelpId}
              value={settings.masteryThreshold}
              onChange={(event) => save({ masteryThreshold: Number(event.target.value) })}
            >
              {THRESHOLD_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section
          className="settings-section card settings-section--danger"
          aria-labelledby="settings-data"
        >
          <h2 id="settings-data" className="settings-section__title">
            Your data
          </h2>
          <p className="settings-section__intro">
            Everything is stored only in this browser. Clearing your browser data also erases it.
          </p>
          <Button variant="danger" onClick={() => setConfirmingClear(true)}>
            Clear All Application Data
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmingClear}
        title="Erase everything?"
        message={
          <>
            <p>
              <strong>
                This permanently deletes all practice history, statistics, saved mistakes and
                settings on this device.
              </strong>
            </p>
            <p className="dialog__small">This cannot be undone.</p>
          </>
        }
        confirmLabel="Yes, erase everything"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onCancel={() => setConfirmingClear(false)}
        onConfirm={() => {
          setConfirmingClear(false);
          store.clearAllData();
          const state: HomeLocationState = { notice: 'data-cleared' };
          navigate('/', { state });
        }}
      />
    </PageContainer>
  );
}
