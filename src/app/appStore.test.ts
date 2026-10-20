import { STORAGE_KEYS } from '../services/storageService';
import { makeAttempt, makeSession } from '../test/fixtures';
import { MemoryStorage } from '../test/memoryStorage';
import { DEFAULT_SETTINGS } from '../types';
import { createAppStore } from './appStore';

describe('app store: recording attempts', () => {
  it('saves the attempt, the session and the updated statistics', () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    const session = makeSession({ attempted: 1, correct: 0, incorrect: 1, completedAt: undefined });
    const attempt = makeAttempt({
      sessionId: session.id,
      operation: 'multiplication',
      difficulty: 2,
      selectedAnswer: 54,
      selfReportedCorrect: false,
    });

    store.recordAttempt(attempt, session);

    expect(storage.json(STORAGE_KEYS.attempts)).toEqual([attempt]);
    expect(storage.json(STORAGE_KEYS.sessions)).toEqual([session]);
    expect(storage.json(STORAGE_KEYS.statistics)).toMatchObject({
      attempted: 1,
      correct: 0,
      incorrect: 1,
      byOperation: { multiplication: { attempted: 1, correct: 0, incorrect: 1 } },
      byDifficulty: { 2: { attempted: 1, correct: 0, incorrect: 1 } },
    });
    expect(store.getState().storageStatus).toBe('ok');
  });

  it('includes the selected answer, result, operation, difficulty, session id and time', () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    const attempt = makeAttempt({ selectedAnswer: 7, selfReportedCorrect: true });
    store.recordAttempt(attempt, makeSession());
    const [stored] = storage.json(STORAGE_KEYS.attempts) as (typeof attempt)[];
    for (const key of [
      'selectedAnswer',
      'selfReportedCorrect',
      'operation',
      'difficulty',
      'sessionId',
      'attemptedAt',
    ] as const) {
      expect(stored[key]).toEqual(attempt[key]);
    }
  });

  it('stores each attempt only once', () => {
    const store = createAppStore(new MemoryStorage());
    const attempt = makeAttempt();
    const session = makeSession();
    store.recordAttempt(attempt, session);
    store.recordAttempt(attempt, session);
    expect(store.getState().attempts).toHaveLength(1);
    expect(store.getState().statistics.attempted).toBe(1);
  });

  it('updates a session record in place as it progresses', () => {
    const store = createAppStore(new MemoryStorage());
    const session = makeSession({ attempted: 1, correct: 1, incorrect: 0, completedAt: undefined });
    store.recordAttempt(makeAttempt({ sessionId: session.id }), session);
    const finished = { ...session, attempted: 2, correct: 2, completedAt: '2026-10-20T11:00:00Z' };
    store.recordAttempt(makeAttempt({ sessionId: session.id }), finished);
    expect(store.getState().sessions).toEqual([finished]);
  });

  it('does not save a session with no answers', () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    store.saveSession(makeSession({ attempted: 0, correct: 0, incorrect: 0 }));
    expect(storage.getItem(STORAGE_KEYS.sessions)).toBeNull();
  });
});

describe('app store: persistence across restarts', () => {
  it('loads everything a previous visit saved', () => {
    const storage = new MemoryStorage();
    const first = createAppStore(storage);
    const session = makeSession({ attempted: 2, correct: 1, incorrect: 1 });
    first.recordAttempt(makeAttempt({ sessionId: session.id }), session);
    first.recordAttempt(
      makeAttempt({ sessionId: session.id, selfReportedCorrect: false }),
      session,
    );
    first.updateSettings({ cardAnimation: false });

    const second = createAppStore(storage); // "browser restart"
    const state = second.getState();
    expect(state.attempts).toHaveLength(2);
    expect(state.sessions).toEqual([session]);
    expect(state.statistics).toMatchObject({ attempted: 2, correct: 1, incorrect: 1 });
    expect(state.settings.cardAnimation).toBe(false);
  });
});

describe('app store: settings', () => {
  it('saves valid changes and ignores invalid ones', () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    store.updateSettings({ showExplanations: false, masteryThreshold: 5 });
    expect(storage.json(STORAGE_KEYS.settings)).toMatchObject({
      showExplanations: false,
      masteryThreshold: 5,
    });
    store.updateSettings({ masteryThreshold: 999, defaultOperations: [] });
    expect(store.getState().settings.masteryThreshold).toBe(DEFAULT_SETTINGS.masteryThreshold);
    expect(store.getState().settings.defaultOperations).toEqual(DEFAULT_SETTINGS.defaultOperations);
  });

  it('notifies subscribers when data changes', () => {
    const store = createAppStore(new MemoryStorage());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.updateSettings({ soundEffects: true });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.updateSettings({ soundEffects: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('app store: storage problems', () => {
  it('keeps working in memory when storage is unavailable', () => {
    const store = createAppStore(null);
    expect(store.getState().storageStatus).toBe('unavailable');
    store.recordAttempt(makeAttempt(), makeSession());
    expect(store.getState().attempts).toHaveLength(1);
    expect(store.getState().statistics.attempted).toBe(1);
  });

  it('reports a failed write but keeps the data in memory', () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    storage.broken = true;
    store.recordAttempt(makeAttempt(), makeSession());
    expect(store.getState().storageStatus).toBe('write-failed');
    expect(store.getState().attempts).toHaveLength(1);
    storage.broken = false;
    store.recordAttempt(makeAttempt(), makeSession());
    expect(store.getState().storageStatus).toBe('ok');
  });
});

describe('app store: clearing', () => {
  it('Reset Statistics clears history but keeps settings', () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    store.updateSettings({ soundEffects: true });
    store.recordAttempt(makeAttempt(), makeSession());
    store.resetStatistics();
    const state = store.getState();
    expect(state.attempts).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.statistics.attempted).toBe(0);
    expect(state.settings.soundEffects).toBe(true);
    expect(createAppStore(storage).getState().statistics.attempted).toBe(0);
  });

  it('Clear All restores the defaults', () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    store.updateSettings({ soundEffects: true, defaultDifficulty: 4 });
    store.recordAttempt(makeAttempt(), makeSession());
    store.clearAllData();
    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(store.getState().attempts).toEqual([]);
    expect(createAppStore(storage).getState().settings).toEqual(DEFAULT_SETTINGS);
  });
});
