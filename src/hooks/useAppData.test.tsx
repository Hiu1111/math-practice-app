import { act, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { AppProvider } from '../app/AppProvider';
import { createAppStore } from '../app/appStore';
import { makeAttempt, makeSession } from '../test/fixtures';
import { MemoryStorage } from '../test/memoryStorage';
import { useAppData } from './useAppData';

function SettingsReader() {
  const animate = useAppData((s) => s.settings.cardAnimation);
  return <p>animation {animate ? 'on' : 'off'}</p>;
}

function AttemptCounter() {
  const count = useAppData((s) => s.attempts.length);
  return <p>{count} answers</p>;
}

describe('useAppData selectors (task 83)', () => {
  it('re-renders a component only when the data it reads changes', () => {
    const store = createAppStore(new MemoryStorage());
    const renders = { settings: 0, attempts: 0 };
    render(
      <AppProvider store={store}>
        <Profiler id="settings" onRender={() => renders.settings++}>
          <SettingsReader />
        </Profiler>
        <Profiler id="attempts" onRender={() => renders.attempts++}>
          <AttemptCounter />
        </Profiler>
      </AppProvider>,
    );
    expect(renders).toEqual({ settings: 1, attempts: 1 });

    // Answering questions saves attempts, statistics and sessions, not settings.
    act(() => {
      for (let i = 0; i < 5; i++) store.recordAttempt(makeAttempt(), makeSession());
    });
    expect(screen.getByText('5 answers')).toBeInTheDocument();
    expect(renders.settings).toBe(1);
    expect(renders.attempts).toBe(2); // the five saves are batched into one render

    // Changing a setting re-renders the reader of settings, not the counter.
    act(() => store.updateSettings({ cardAnimation: false }));
    expect(screen.getByText('animation off')).toBeInTheDocument();
    expect(renders).toEqual({ settings: 2, attempts: 2 });
  });
});
