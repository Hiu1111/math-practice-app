import {
  DEFAULT_SETTINGS,
  emptyAppStatistics,
  type AppSettings,
  type AppStatistics,
  type MistakePattern,
  type PracticeAttempt,
  type PracticeSession,
} from '../types';
import {
  isStoredSession,
  isValidAttempt,
  isValidMistakePattern,
  isValidStatistics,
  sanitizeSettings,
} from '../utils/validation';
import { applyAttempt, computeReviewTotals } from './statisticsService';

/**
 * localStorage keys from spec section 11, plus `archive` (spec 23: older attempt
 * records summarized). The app never reads or writes any other key.
 */
export const STORAGE_KEYS = {
  settings: 'mathPractice.settings',
  sessions: 'mathPractice.sessions',
  attempts: 'mathPractice.attempts',
  mistakePatterns: 'mathPractice.mistakePatterns',
  statistics: 'mathPractice.statistics',
  version: 'mathPractice.version',
  archive: 'mathPractice.archive',
} as const;

const DATA_KEYS = [
  STORAGE_KEYS.settings,
  STORAGE_KEYS.sessions,
  STORAGE_KEYS.attempts,
  STORAGE_KEYS.mistakePatterns,
  STORAGE_KEYS.statistics,
  STORAGE_KEYS.archive,
];

/**
 * Current data-schema version (stored as {"version": 2}).
 * v1: first release. v2: statistics gained review totals for mistake-review questions.
 */
export const SCHEMA_VERSION = 2;

/**
 * Keep detailed history compact (spec 23, TODO task 84). Only the newest
 * attempts are kept in full: enough for the 100 stored sessions at 20 questions
 * each. Older attempts are folded into a small archive summary, and the
 * aggregate statistics are stored separately, so no totals are ever lost.
 * (Measured: 5000 detailed attempts took ~1.9 million characters of storage and
 * about 120 ms per answer to save on a 6x-slowed CPU.)
 */
export const MAX_STORED_ATTEMPTS = 2000;
export const MAX_STORED_SESSIONS = 100;

/** Below this many attempts we stop trimming to make room and report the failure instead. */
const MIN_ATTEMPTS_WHEN_TRIMMING = 50;

// ------------------------------------------------------------------
// Low-level access
// ------------------------------------------------------------------

/**
 * The browser's localStorage, or null if it is unavailable (disabled,
 * blocked, or throwing in some private-browsing modes).
 */
export function getBrowserStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = 'mathPractice.__probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export type ReadResult =
  | { status: 'ok'; value: unknown }
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'unavailable' };

/** Read and parse a JSON value. Never throws. */
export function readJson(storage: Storage | null, key: string): ReadResult {
  if (!storage) return { status: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'missing' };
  try {
    return { status: 'ok', value: JSON.parse(raw) };
  } catch {
    return { status: 'invalid' };
  }
}

export type WriteResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' | 'error' };

/** Browsers report a full storage area in slightly different ways. */
export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

/** Serialize and write a value. Never throws. */
export function writeJson(storage: Storage | null, key: string, value: unknown): WriteResult {
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'error' };
  }
}

function removeKey(storage: Storage | null, key: string): WriteResult {
  if (!storage) return { ok: false, reason: 'unavailable' };
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// ------------------------------------------------------------------
// Archive of older attempts
// ------------------------------------------------------------------

/** Totals for attempts that were moved out of the detailed history. */
export interface AttemptArchive {
  statistics: AppStatistics;
  /** When the oldest and newest archived attempts were answered (null if none). */
  oldestAt: string | null;
  newestAt: string | null;
}

export function emptyArchive(): AttemptArchive {
  return { statistics: emptyAppStatistics(), oldestAt: null, newestAt: null };
}

/** Add attempts (oldest first) to the archive's totals. */
export function archiveAttempts(
  archive: AttemptArchive,
  attempts: readonly PracticeAttempt[],
): AttemptArchive {
  if (attempts.length === 0) return archive;
  return {
    statistics: attempts.reduce(applyAttempt, archive.statistics),
    oldestAt: archive.oldestAt ?? attempts[0].attemptedAt,
    newestAt: attempts[attempts.length - 1].attemptedAt,
  };
}

export function isValidArchive(value: unknown): value is AttemptArchive {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const isDate = (d: unknown) =>
    d === null || (typeof d === 'string' && !Number.isNaN(Date.parse(d)));
  return isValidStatistics(v.statistics) && isDate(v.oldestAt) && isDate(v.newestAt);
}

// ------------------------------------------------------------------
// Schema versioning
// ------------------------------------------------------------------

/**
 * Migrations keyed by the version they upgrade FROM. Version 0 means data
 * written before versioning existed; its shapes match version 1, so there is
 * nothing to change. Add an entry here whenever SCHEMA_VERSION goes up.
 */
const MIGRATIONS: Record<number, (storage: Storage) => void> = {
  0: () => {},
  // v1 → v2: add review totals to the stored statistics, counted from stored attempts.
  1: (storage) => {
    const stats = readJson(storage, STORAGE_KEYS.statistics);
    if (stats.status !== 'ok' || typeof stats.value !== 'object' || stats.value === null) return;
    if ('review' in stats.value) return;
    const attempts = readJson(storage, STORAGE_KEYS.attempts);
    const list = attempts.status === 'ok' && Array.isArray(attempts.value) ? attempts.value : [];
    const review = computeReviewTotals(list.filter(isValidAttempt));
    writeJson(storage, STORAGE_KEYS.statistics, { ...stats.value, review });
  },
};

export interface MigrationResult {
  /** Version found in storage (null for a brand-new browser). */
  from: number | null;
  to: number;
}

function hasAnyData(storage: Storage): boolean {
  return DATA_KEYS.some((key) => {
    try {
      return storage.getItem(key) !== null;
    } catch {
      return false;
    }
  });
}

/** Detect the stored schema version and upgrade the data step by step. */
export function migrate(storage: Storage | null): MigrationResult {
  if (!storage) return { from: null, to: SCHEMA_VERSION };

  const stored = readJson(storage, STORAGE_KEYS.version);
  let from: number | null = null;
  if (stored.status === 'ok') {
    const v = (stored.value as { version?: unknown } | null)?.version;
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) from = v;
  }
  if (from === null && hasAnyData(storage)) from = 0;

  // Data from a newer version of the app: leave it alone (validation still protects us).
  if (from !== null && from > SCHEMA_VERSION) return { from, to: from };

  for (let v = from ?? SCHEMA_VERSION; v < SCHEMA_VERSION; v++) MIGRATIONS[v]?.(storage);
  writeJson(storage, STORAGE_KEYS.version, { version: SCHEMA_VERSION });
  return { from, to: SCHEMA_VERSION };
}

// ------------------------------------------------------------------
// Loading
// ------------------------------------------------------------------

export type DataCategory = 'settings' | 'sessions' | 'attempts' | 'statistics' | 'mistakePatterns';

export interface LoadedData {
  settings: AppSettings;
  sessions: PracticeSession[];
  attempts: PracticeAttempt[];
  archive: AttemptArchive;
  statistics: AppStatistics;
  mistakePatterns: MistakePattern[];
  /** Categories that were missing parts or corrupted and have been repaired. */
  repaired: DataCategory[];
  migration: MigrationResult;
}

/** Keep the valid records of a stored list; report whether anything was dropped. */
function loadList<T>(
  storage: Storage | null,
  key: string,
  isValid: (value: unknown) => value is T,
): { items: T[]; repaired: boolean } {
  const result = readJson(storage, key);
  if (result.status === 'missing' || result.status === 'unavailable') {
    return { items: [], repaired: false };
  }
  if (result.status === 'invalid' || !Array.isArray(result.value)) {
    return { items: [], repaired: true };
  }
  const items = result.value.filter(isValid);
  return { items, repaired: items.length !== result.value.length };
}

/**
 * Load everything the app stores. Each category is validated on its own:
 * a corrupted category is repaired or reset without touching the others
 * (spec section 17), and the repaired version is written back.
 */
export function loadAppData(storage: Storage | null): LoadedData {
  const migration = migrate(storage);
  const repaired: DataCategory[] = [];

  // Settings: keep valid fields, default the rest.
  const settingsRead = readJson(storage, STORAGE_KEYS.settings);
  let settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    defaultOperations: [...DEFAULT_SETTINGS.defaultOperations],
  };
  if (settingsRead.status === 'ok' || settingsRead.status === 'invalid') {
    const sanitized = sanitizeSettings(settingsRead.status === 'ok' ? settingsRead.value : null);
    settings = sanitized.settings;
    if (sanitized.repaired) {
      repaired.push('settings');
      writeJson(storage, STORAGE_KEYS.settings, settings);
    }
  }

  const sessionList = loadList(storage, STORAGE_KEYS.sessions, isStoredSession);
  if (sessionList.repaired) {
    repaired.push('sessions');
    writeJson(storage, STORAGE_KEYS.sessions, sessionList.items);
  }

  const mistakeList = loadList(storage, STORAGE_KEYS.mistakePatterns, isValidMistakePattern);
  if (mistakeList.repaired) {
    repaired.push('mistakePatterns');
    writeJson(storage, STORAGE_KEYS.mistakePatterns, mistakeList.items);
  }

  // The archive is internal bookkeeping that the student never sees, so a
  // damaged one is simply reset without showing a notice.
  const archiveRead = readJson(storage, STORAGE_KEYS.archive);
  let archive = emptyArchive();
  if (archiveRead.status === 'ok' && isValidArchive(archiveRead.value)) {
    archive = archiveRead.value;
  } else if (archiveRead.status === 'ok' || archiveRead.status === 'invalid') {
    removeKey(storage, STORAGE_KEYS.archive);
  }

  const attemptList = loadList(storage, STORAGE_KEYS.attempts, isValidAttempt);
  let attempts = attemptList.items;
  if (attemptList.repaired) {
    repaired.push('attempts');
    writeJson(storage, STORAGE_KEYS.attempts, attempts);
  }
  // A longer history (e.g. saved by an earlier version) is archived down to size.
  if (attempts.length > MAX_STORED_ATTEMPTS) {
    const saved = saveAttempts(storage, attempts, archive);
    attempts = saved.attempts;
    archive = saved.archive;
  }

  // Aggregates: if missing or inconsistent, rebuild them from the archive
  // totals plus the detailed attempts, so the rebuilt totals are complete.
  const statsRead = readJson(storage, STORAGE_KEYS.statistics);
  let statistics: AppStatistics;
  if (statsRead.status === 'ok' && isValidStatistics(statsRead.value)) {
    statistics = statsRead.value;
  } else {
    statistics = attempts.reduce(applyAttempt, archive.statistics);
    if (
      statsRead.status !== 'unavailable' &&
      (statsRead.status !== 'missing' || statistics.attempted > 0)
    ) {
      repaired.push('statistics');
      writeJson(storage, STORAGE_KEYS.statistics, statistics);
    }
  }

  if (repaired.length > 0 && import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.warn('[storage] Repaired stored data:', repaired);
  }

  return {
    settings,
    sessions: sessionList.items,
    attempts,
    archive,
    mistakePatterns: mistakeList.items,
    statistics,
    repaired,
    migration,
  };
}

// ------------------------------------------------------------------
// Saving
// ------------------------------------------------------------------

/**
 * Save the attempt history, newest last, keeping at most MAX_STORED_ATTEMPTS in
 * full. Older attempts are folded into the archive. If storage is full, more
 * of the oldest attempts are archived and the save is tried again (TODO task
 * 35), so recent history keeps saving.
 *
 * Returns what is now stored. If saving fails, nothing in storage changed: the
 * archive is left as it was, and the in-memory list is only capped.
 */
export function saveAttempts(
  storage: Storage | null,
  attempts: readonly PracticeAttempt[],
  archive: AttemptArchive = emptyArchive(),
): {
  result: WriteResult;
  attempts: PracticeAttempt[];
  archive: AttemptArchive;
  /** The archive write, when the archive changed (null otherwise). */
  archiveResult: WriteResult | null;
} {
  let keepFrom = Math.max(0, attempts.length - MAX_STORED_ATTEMPTS);
  for (;;) {
    const list = attempts.slice(keepFrom);
    const result = writeJson(storage, STORAGE_KEYS.attempts, list);
    if (result.ok) {
      const nextArchive = archiveAttempts(archive, attempts.slice(0, keepFrom));
      const archiveResult =
        nextArchive === archive ? null : writeJson(storage, STORAGE_KEYS.archive, nextArchive);
      return { result, attempts: list, archive: nextArchive, archiveResult };
    }
    if (result.reason !== 'quota' || list.length <= MIN_ATTEMPTS_WHEN_TRIMMING) {
      return {
        result,
        attempts: attempts.slice(-MAX_STORED_ATTEMPTS),
        archive,
        archiveResult: null,
      };
    }
    keepFrom += Math.floor(list.length / 2);
  }
}

/** Remove the practice history and statistics, keeping settings (Reset Statistics). */
export function clearPracticeHistory(storage: Storage | null): WriteResult[] {
  return [
    STORAGE_KEYS.sessions,
    STORAGE_KEYS.attempts,
    STORAGE_KEYS.archive,
    STORAGE_KEYS.statistics,
    STORAGE_KEYS.mistakePatterns,
  ].map((key) => removeKey(storage, key));
}

/** Remove every key this app owns, and nothing else (Clear All Application Data). */
export function clearAllAppData(storage: Storage | null): WriteResult[] {
  return Object.values(STORAGE_KEYS).map((key) => removeKey(storage, key));
}
