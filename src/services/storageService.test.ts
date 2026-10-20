import { makeAttempt, makeSession } from '../test/fixtures';
import { MemoryStorage } from '../test/memoryStorage';
import { DEFAULT_SETTINGS, emptyAppStatistics } from '../types';
import {
  MAX_STORED_ATTEMPTS,
  SCHEMA_VERSION,
  STORAGE_KEYS,
  clearAllAppData,
  clearPracticeHistory,
  getBrowserStorage,
  loadAppData,
  migrate,
  readJson,
  saveAttempts,
  writeJson,
} from './storageService';

describe('storage keys', () => {
  it('uses the key names from spec section 11', () => {
    expect(Object.values(STORAGE_KEYS)).toEqual([
      'mathPractice.settings',
      'mathPractice.sessions',
      'mathPractice.attempts',
      'mathPractice.mistakePatterns',
      'mathPractice.statistics',
      'mathPractice.version',
    ]);
  });
});

describe('readJson / writeJson', () => {
  it('round-trips JSON values', () => {
    const storage = new MemoryStorage();
    expect(writeJson(storage, 'k', { a: [1, 2] })).toEqual({ ok: true });
    expect(readJson(storage, 'k')).toEqual({ status: 'ok', value: { a: [1, 2] } });
  });

  it('reports missing keys and unparseable JSON without throwing', () => {
    const storage = new MemoryStorage({ bad: '{not json' });
    expect(readJson(storage, 'nope')).toEqual({ status: 'missing' });
    expect(readJson(storage, 'bad')).toEqual({ status: 'invalid' });
  });

  it('reports unavailable storage without throwing', () => {
    const broken = new MemoryStorage();
    broken.broken = true;
    expect(readJson(broken, 'k')).toEqual({ status: 'unavailable' });
    expect(writeJson(broken, 'k', 1)).toEqual({ ok: false, reason: 'error' });
    expect(readJson(null, 'k')).toEqual({ status: 'unavailable' });
    expect(writeJson(null, 'k', 1)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('recognises a full storage area', () => {
    const tiny = new MemoryStorage({}, 20);
    expect(writeJson(tiny, 'key', 'x'.repeat(50))).toEqual({ ok: false, reason: 'quota' });
  });

  it('detects whether the real browser storage works', () => {
    expect(getBrowserStorage()).toBe(window.localStorage);
  });
});

describe('schema versioning', () => {
  it('stores the current version for a new browser', () => {
    const storage = new MemoryStorage();
    expect(migrate(storage)).toEqual({ from: null, to: SCHEMA_VERSION });
    expect(storage.json(STORAGE_KEYS.version)).toEqual({ version: SCHEMA_VERSION });
  });

  it('treats data without a version as version 0 and upgrades it', () => {
    const storage = new MemoryStorage({ [STORAGE_KEYS.attempts]: [] });
    expect(migrate(storage)).toEqual({ from: 0, to: SCHEMA_VERSION });
    expect(storage.json(STORAGE_KEYS.version)).toEqual({ version: SCHEMA_VERSION });
  });

  it('leaves data from a newer version of the app untouched', () => {
    const storage = new MemoryStorage({ [STORAGE_KEYS.version]: { version: 99 } });
    expect(migrate(storage)).toEqual({ from: 99, to: 99 });
    expect(storage.json(STORAGE_KEYS.version)).toEqual({ version: 99 });
  });

  it('never touches keys that belong to other apps', () => {
    const storage = new MemoryStorage({ 'someOtherApp.data': 'keep me', theme: 'dark' });
    loadAppData(storage);
    clearAllAppData(storage);
    expect(storage.getItem('someOtherApp.data')).toBe('keep me');
    expect(storage.getItem('theme')).toBe('dark');
  });
});

describe('loadAppData', () => {
  it('returns defaults for a brand-new browser without reporting repairs', () => {
    const data = loadAppData(new MemoryStorage());
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(data.sessions).toEqual([]);
    expect(data.attempts).toEqual([]);
    expect(data.statistics).toEqual(emptyAppStatistics());
    expect(data.repaired).toEqual([]);
  });

  it('works with no storage at all', () => {
    const data = loadAppData(null);
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(data.attempts).toEqual([]);
  });

  it('keeps valid settings fields and repairs invalid ones', () => {
    const storage = new MemoryStorage({
      [STORAGE_KEYS.settings]: { cardAnimation: false, defaultDifficulty: 9, masteryThreshold: 4 },
    });
    const data = loadAppData(storage);
    expect(data.settings.cardAnimation).toBe(false);
    expect(data.settings.masteryThreshold).toBe(4);
    expect(data.settings.defaultDifficulty).toBe(DEFAULT_SETTINGS.defaultDifficulty);
    expect(data.repaired).toContain('settings');
    // The repaired settings are written back.
    expect(storage.json(STORAGE_KEYS.settings)).toEqual(data.settings);
  });

  it('drops invalid records but keeps the valid ones', () => {
    const good = makeAttempt();
    const storage = new MemoryStorage({
      [STORAGE_KEYS.attempts]: [good, { id: 'broken' }, null],
      [STORAGE_KEYS.sessions]: [makeSession(), { id: 'x', attempted: -1 }],
    });
    const data = loadAppData(storage);
    expect(data.attempts).toEqual([good]);
    expect(data.sessions).toHaveLength(1);
    expect(data.repaired).toEqual(expect.arrayContaining(['attempts', 'sessions']));
  });

  it('resets only the corrupted category (spec section 17)', () => {
    const session = makeSession();
    const storage = new MemoryStorage({
      [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, soundEffects: true },
      [STORAGE_KEYS.sessions]: [session],
      [STORAGE_KEYS.attempts]: '{{{ corrupted',
    });
    const data = loadAppData(storage);
    expect(data.attempts).toEqual([]);
    expect(data.sessions).toEqual([session]);
    expect(data.settings.soundEffects).toBe(true);
    expect(data.repaired).toEqual(['attempts']);
  });

  it('rebuilds corrupted statistics from the stored attempts', () => {
    const attempts = [
      makeAttempt({ operation: 'division', difficulty: 3, selfReportedCorrect: false }),
      makeAttempt({ operation: 'division', difficulty: 3 }),
      makeAttempt(),
    ];
    const storage = new MemoryStorage({
      [STORAGE_KEYS.attempts]: attempts,
      [STORAGE_KEYS.statistics]: { attempted: 3, correct: 3, incorrect: 3 }, // does not add up
    });
    const data = loadAppData(storage);
    expect(data.statistics).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 });
    expect(data.statistics.byOperation.division).toEqual({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    });
    expect(data.statistics.byDifficulty[3]).toEqual({ attempted: 2, correct: 1, incorrect: 1 });
    expect(data.repaired).toContain('statistics');
  });
});

describe('saveAttempts', () => {
  it(`keeps at most ${MAX_STORED_ATTEMPTS} detailed attempts, dropping the oldest`, () => {
    const storage = new MemoryStorage();
    const attempts = Array.from({ length: MAX_STORED_ATTEMPTS + 10 }, () => makeAttempt());
    const saved = saveAttempts(storage, attempts);
    expect(saved.result.ok).toBe(true);
    expect(saved.attempts).toHaveLength(MAX_STORED_ATTEMPTS);
    expect(saved.attempts[0]).toEqual(attempts[10]);
    expect(saved.attempts.at(-1)).toEqual(attempts.at(-1));
  });

  it('makes room by dropping old attempts when storage is full', () => {
    const attempts = Array.from({ length: 400 }, () => makeAttempt());
    const oneAttempt = JSON.stringify(attempts[0]).length;
    const storage = new MemoryStorage({}, oneAttempt * 150); // room for ~150
    const saved = saveAttempts(storage, attempts);
    expect(saved.result.ok).toBe(true);
    expect(saved.attempts.length).toBeLessThan(400);
    expect(saved.attempts.at(-1)).toEqual(attempts.at(-1)); // newest kept
  });

  it('reports failure if even a small history will not fit', () => {
    const storage = new MemoryStorage({}, 10);
    const attempts = Array.from({ length: 200 }, () => makeAttempt());
    const saved = saveAttempts(storage, attempts);
    expect(saved.result).toEqual({ ok: false, reason: 'quota' });
    expect(saved.attempts).toHaveLength(200); // nothing lost in memory
  });
});

describe('clearing data', () => {
  it('Reset Statistics removes history but keeps settings', () => {
    const storage = new MemoryStorage({
      [STORAGE_KEYS.settings]: DEFAULT_SETTINGS,
      [STORAGE_KEYS.sessions]: [makeSession()],
      [STORAGE_KEYS.attempts]: [makeAttempt()],
      [STORAGE_KEYS.statistics]: emptyAppStatistics(),
      [STORAGE_KEYS.mistakePatterns]: [],
    });
    clearPracticeHistory(storage);
    expect(storage.getItem(STORAGE_KEYS.settings)).not.toBeNull();
    for (const key of ['sessions', 'attempts', 'statistics', 'mistakePatterns'] as const) {
      expect(storage.getItem(STORAGE_KEYS[key])).toBeNull();
    }
  });

  it('Clear All removes every app key', () => {
    const storage = new MemoryStorage({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
    migrate(storage);
    clearAllAppData(storage);
    expect(storage.length).toBe(0);
  });
});
