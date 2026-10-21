import { clearActiveSession } from '../services/activeSessionService';
import { updateMistakePatterns } from '../services/mistakeService';
import { applyAttempt, sessionActivityTime } from '../services/statisticsService';
import {
  MAX_STORED_SESSIONS,
  STORAGE_KEYS,
  clearAllAppData,
  clearPracticeHistory,
  emptyArchive,
  getBrowserStorage,
  loadAppData,
  saveAttempts,
  writeJson,
  type AttemptArchive,
  type DataCategory,
  type WriteResult,
} from '../services/storageService';
import {
  DEFAULT_SETTINGS,
  emptyAppStatistics,
  type AppSettings,
  type AppStatistics,
  type MistakePattern,
  type PracticeAttempt,
  type PracticeSession,
} from '../types';
import { sanitizeSettings } from '../utils/validation';

/**
 * ok: saving works. unavailable: the browser will not let us save at all.
 * write-failed: the latest save failed (for example, storage is full).
 */
export type StorageStatus = 'ok' | 'unavailable' | 'write-failed';

export interface AppDataState {
  settings: AppSettings;
  sessions: PracticeSession[];
  attempts: PracticeAttempt[];
  /** Totals for older attempts that are no longer stored in full (spec 23). */
  archive: AttemptArchive;
  statistics: AppStatistics;
  mistakePatterns: MistakePattern[];
  storageStatus: StorageStatus;
  /** Data categories that could not be read when the app opened and were reset or repaired. */
  repairedOnLoad: DataCategory[];
}

export interface AppStore {
  getState: () => AppDataState;
  subscribe: (listener: () => void) => () => void;
  /** Save one answered question together with the updated session (spec 6.3 step 3). */
  recordAttempt: (attempt: PracticeAttempt, session: PracticeSession) => void;
  /** Save a session's latest totals or completion details. */
  saveSession: (session: PracticeSession) => void;
  updateSettings: (changes: Partial<AppSettings>) => void;
  /** Erase practice history, statistics and mistakes; settings are kept. */
  resetStatistics: () => void;
  /** Erase everything the app stores and restore the defaults. */
  clearAllData: () => void;
  /** Hide the "some saved data was reset" notice. */
  dismissRepairNotice: () => void;
}

function defaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, defaultOperations: [...DEFAULT_SETTINGS.defaultOperations] };
}

/** Insert or replace a session, keeping the most recent MAX_STORED_SESSIONS. */
export function upsertSession(
  sessions: readonly PracticeSession[],
  session: PracticeSession,
): PracticeSession[] {
  const next = sessions.filter((s) => s.id !== session.id);
  next.push(session);
  if (next.length <= MAX_STORED_SESSIONS) return next;
  return [...next]
    .sort((a, b) => sessionActivityTime(b).localeCompare(sessionActivityTime(a)))
    .slice(0, MAX_STORED_SESSIONS);
}

/**
 * The app's data, kept outside React so every rule about storage lives in
 * plain, testable functions. Each action updates memory first (so practice
 * carries on even if saving fails) and then writes through to storage.
 */
export function createAppStore(storage: Storage | null = getBrowserStorage()): AppStore {
  const loaded = loadAppData(storage);
  let state: AppDataState = {
    settings: loaded.settings,
    sessions: loaded.sessions,
    attempts: loaded.attempts,
    archive: loaded.archive,
    statistics: loaded.statistics,
    mistakePatterns: loaded.mistakePatterns,
    storageStatus: storage ? 'ok' : 'unavailable',
    repairedOnLoad: loaded.repaired,
  };
  const listeners = new Set<() => void>();

  const commit = (changes: Partial<AppDataState>, writes: WriteResult[]) => {
    const failed = writes.some((w) => !w.ok);
    state = {
      ...state,
      ...changes,
      // Nothing written (e.g. dismissing a notice): keep the current status.
      storageStatus: !storage
        ? 'unavailable'
        : writes.length === 0
          ? state.storageStatus
          : failed
            ? 'write-failed'
            : 'ok',
    };
    listeners.forEach((listener) => listener());
  };

  return {
    getState: () => state,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    recordAttempt: (attempt, session) => {
      // Each attempt is stored once, even if this is called twice.
      if (state.attempts.some((a) => a.id === attempt.id)) return;
      const statistics = applyAttempt(state.statistics, attempt);
      const sessions = upsertSession(state.sessions, session);
      const mistakePatterns = updateMistakePatterns(
        state.mistakePatterns,
        attempt,
        state.settings.masteryThreshold,
      );
      const saved = saveAttempts(storage, [...state.attempts, attempt], state.archive);
      const writes = [
        saved.result,
        ...(saved.archiveResult ? [saved.archiveResult] : []),
        writeJson(storage, STORAGE_KEYS.statistics, statistics),
        writeJson(storage, STORAGE_KEYS.sessions, sessions),
      ];
      if (mistakePatterns !== state.mistakePatterns) {
        writes.push(writeJson(storage, STORAGE_KEYS.mistakePatterns, mistakePatterns));
      }
      commit(
        { attempts: saved.attempts, archive: saved.archive, statistics, sessions, mistakePatterns },
        writes,
      );
    },

    saveSession: (session) => {
      if (session.attempted === 0) return; // Nothing worth keeping.
      const sessions = upsertSession(state.sessions, session);
      commit({ sessions }, [writeJson(storage, STORAGE_KEYS.sessions, sessions)]);
    },

    updateSettings: (changes) => {
      const { settings } = sanitizeSettings({ ...state.settings, ...changes });
      commit({ settings }, [writeJson(storage, STORAGE_KEYS.settings, settings)]);
    },

    resetStatistics: () => {
      commit(
        {
          sessions: [],
          attempts: [],
          archive: emptyArchive(),
          statistics: emptyAppStatistics(),
          mistakePatterns: [],
        },
        clearPracticeHistory(storage),
      );
    },

    clearAllData: () => {
      clearActiveSession();
      commit(
        {
          settings: defaultSettings(),
          sessions: [],
          attempts: [],
          archive: emptyArchive(),
          statistics: emptyAppStatistics(),
          mistakePatterns: [],
        },
        clearAllAppData(storage),
      );
    },

    dismissRepairNotice: () => {
      commit({ repairedOnLoad: [] }, []);
    },
  };
}
