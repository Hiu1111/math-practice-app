import { makeAttempt, makeSession } from '../test/fixtures';
import { MemoryStorage } from '../test/memoryStorage';
import { DEFAULT_SETTINGS, emptyAppStatistics } from '../types';
import { computeStatistics } from './statisticsService';
import {
  MAX_STORED_ATTEMPTS,
  SCHEMA_VERSION,
  STORAGE_KEYS,
  clearAllAppData,
  clearPracticeHistory,
  emptyArchive,
  getBrowserStorage,
  loadAppData,
  migrate,
  readJson,
  saveAttempts,
  writeJson,
} from './storageService';

describe('storage keys', () => {
  it('uses the key names from spec section 11, plus the archive of older attempts (spec 23)', () => {
    expect(Object.values(STORAGE_KEYS)).toEqual([
      'mathPractice.settings',
      'mathPractice.sessions',
      'mathPractice.attempts',
      'mathPractice.mistakePatterns',
      'mathPractice.statistics',
      'mathPractice.version',
      'mathPractice.archive',
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

  it('folds the attempts it drops into the archive, so their totals are kept', () => {
    const storage = new MemoryStorage();
    const attempts = Array.from({ length: MAX_STORED_ATTEMPTS + 3 }, (_, i) =>
      makeAttempt({ selfReportedCorrect: i !== 1, operation: i < 3 ? 'division' : 'addition' }),
    );
    const saved = saveAttempts(storage, attempts);
    expect(saved.archiveResult).toEqual({ ok: true });
    expect(saved.archive).toEqual({
      statistics: computeStatistics(attempts.slice(0, 3)),
      oldestAt: attempts[0].attemptedAt,
      newestAt: attempts[2].attemptedAt,
    });
    expect(readJson(storage, STORAGE_KEYS.archive)).toEqual({ status: 'ok', value: saved.archive });
    expect(saved.archive.statistics).toMatchObject({ attempted: 3, correct: 2, incorrect: 1 });
    expect(saved.archive.statistics.byOperation.division.attempted).toBe(3);
  });

  it('does not touch the archive when nothing is dropped', () => {
    const storage = new MemoryStorage();
    const saved = saveAttempts(storage, [makeAttempt()]);
    expect(saved.archiveResult).toBeNull();
    expect(saved.archive).toEqual(emptyArchive());
    expect(storage.getItem(STORAGE_KEYS.archive)).toBeNull();
  });

  it('archives whatever it drops to make room when storage is full', () => {
    const attempts = Array.from({ length: 400 }, () => makeAttempt());
    const storage = new MemoryStorage({}, JSON.stringify(attempts[0]).length * 150);
    const saved = saveAttempts(storage, attempts);
    expect(saved.result.ok).toBe(true);
    expect(saved.archive.statistics.attempted + saved.attempts.length).toBe(400);
  });

  it('leaves storage and the archive alone, and caps memory, when saving fails', () => {
    const storage = new MemoryStorage();
    storage.broken = true;
    const attempts = Array.from({ length: MAX_STORED_ATTEMPTS + 5 }, () => makeAttempt());
    const saved = saveAttempts(storage, attempts);
    expect(saved.result.ok).toBe(false);
    expect(saved.archive).toEqual(emptyArchive());
    expect(saved.attempts).toHaveLength(MAX_STORED_ATTEMPTS);
    expect(saved.attempts.at(-1)).toEqual(attempts.at(-1));
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

describe('mistake patterns in storage (task 53)', () => {
  const pattern = {
    id: 'mistake_1',
    operation: 'multiplication',
    firstOperand: 8,
    secondOperand: 7,
    correctAnswer: 56,
    difficulty: 2,
    incorrectCount: 2,
    similarCorrectCount: 1,
    firstIncorrectAt: '2026-10-19T10:00:00.000Z',
    lastIncorrectAt: '2026-10-20T10:00:00.000Z',
    mastered: false,
  };

  it('loads valid patterns and drops invalid ones', () => {
    const storage = new MemoryStorage({
      [STORAGE_KEYS.mistakePatterns]: [
        pattern,
        { ...pattern, id: 'zero-divisor', operation: 'division', secondOperand: 0 },
        { ...pattern, id: 'never-missed', incorrectCount: 0 },
        'junk',
      ],
    });
    const data = loadAppData(storage);
    expect(data.mistakePatterns).toEqual([pattern]);
    expect(data.repaired).toContain('mistakePatterns');
    expect(storage.json(STORAGE_KEYS.mistakePatterns)).toEqual([pattern]);
  });

  it('recovers from a corrupted mistake list without touching other data', () => {
    const attempt = makeAttempt();
    const storage = new MemoryStorage({
      [STORAGE_KEYS.mistakePatterns]: '{oops',
      [STORAGE_KEYS.attempts]: [attempt],
    });
    const data = loadAppData(storage);
    expect(data.mistakePatterns).toEqual([]);
    expect(data.attempts).toEqual([attempt]);
  });
});

describe('schema v1 → v2 migration', () => {
  it('adds review totals to version 1 statistics, counted from stored attempts', () => {
    const attempts = [
      makeAttempt({ source: 'mistake-review', mistakePatternId: 'm1' }),
      makeAttempt({ source: 'mistake-review', mistakePatternId: 'm1', selfReportedCorrect: false }),
      makeAttempt(),
    ];
    const { review: _review, ...v1Statistics } = computeStatistics(attempts);
    const storage = new MemoryStorage({
      [STORAGE_KEYS.version]: { version: 1 },
      [STORAGE_KEYS.attempts]: attempts,
      [STORAGE_KEYS.statistics]: v1Statistics,
    });

    expect(migrate(storage)).toEqual({ from: 1, to: 2 });
    expect(storage.json(STORAGE_KEYS.statistics)).toEqual({
      ...v1Statistics,
      review: { attempted: 2, correct: 1, incorrect: 1 },
    });
    expect(storage.json(STORAGE_KEYS.version)).toEqual({ version: 2 });
    // The migrated statistics are valid, so nothing needs repairing on load.
    expect(loadAppData(storage).repaired).toEqual([]);
  });

  it('upgrades data with no version (v0) all the way to v2', () => {
    const attempts = [makeAttempt()];
    const { review: _review, ...oldStatistics } = computeStatistics(attempts);
    const storage = new MemoryStorage({
      [STORAGE_KEYS.attempts]: attempts,
      [STORAGE_KEYS.statistics]: oldStatistics,
    });
    const data = loadAppData(storage);
    expect(data.migration).toEqual({ from: 0, to: 2 });
    expect(data.statistics.review).toEqual({ attempted: 0, correct: 0, incorrect: 0 });
    expect(data.statistics.attempted).toBe(1);
  });
});

describe('archive of older attempts (task 84)', () => {
  const history = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      makeAttempt({ selfReportedCorrect: i % 4 !== 0, difficulty: ((i % 4) + 1) as 1 | 2 | 3 | 4 }),
    );

  it('trims a long history saved by an earlier version, keeping every total', () => {
    const attempts = history(MAX_STORED_ATTEMPTS + 1000);
    const statistics = computeStatistics(attempts);
    const storage = new MemoryStorage({
      [STORAGE_KEYS.version]: { version: SCHEMA_VERSION },
      [STORAGE_KEYS.attempts]: attempts,
      [STORAGE_KEYS.statistics]: statistics,
    });
    const loaded = loadAppData(storage);
    expect(loaded.attempts).toHaveLength(MAX_STORED_ATTEMPTS);
    expect(loaded.attempts.at(-1)).toEqual(attempts.at(-1));
    expect(loaded.archive.statistics.attempted).toBe(1000);
    expect(loaded.statistics).toEqual(statistics);
    expect(loaded.repaired).toEqual([]); // nothing was wrong, so no notice
    // Saved back in the smaller form.
    const stored = readJson(storage, STORAGE_KEYS.attempts);
    expect(stored.status === 'ok' && (stored.value as unknown[]).length).toBe(MAX_STORED_ATTEMPTS);
  });

  it('rebuilds corrupted statistics exactly, from the archive plus the detailed attempts', () => {
    const attempts = history(MAX_STORED_ATTEMPTS + 250);
    const storage = new MemoryStorage({ [STORAGE_KEYS.version]: { version: SCHEMA_VERSION } });
    saveAttempts(storage, attempts);
    storage.setItem(STORAGE_KEYS.statistics, '{oops');
    const loaded = loadAppData(storage);
    expect(loaded.repaired).toEqual(['statistics']);
    expect(loaded.statistics).toEqual(computeStatistics(attempts));
    expect(loaded.statistics.attempted).toBe(MAX_STORED_ATTEMPTS + 250);
  });

  it('quietly resets a damaged archive without touching anything the student sees', () => {
    const statistics = computeStatistics(history(10));
    const storage = new MemoryStorage({
      [STORAGE_KEYS.version]: { version: SCHEMA_VERSION },
      [STORAGE_KEYS.statistics]: statistics,
      [STORAGE_KEYS.archive]: { statistics: 'nope' },
    });
    const loaded = loadAppData(storage);
    expect(loaded.archive).toEqual(emptyArchive());
    expect(loaded.statistics).toEqual(statistics);
    expect(loaded.repaired).toEqual([]);
    expect(storage.getItem(STORAGE_KEYS.archive)).toBeNull();
  });

  it('Reset Statistics and Clear All also remove the archive', () => {
    const storage = new MemoryStorage();
    saveAttempts(storage, history(MAX_STORED_ATTEMPTS + 1));
    expect(storage.getItem(STORAGE_KEYS.archive)).not.toBeNull();
    clearPracticeHistory(storage);
    expect(storage.getItem(STORAGE_KEYS.archive)).toBeNull();
    saveAttempts(storage, history(MAX_STORED_ATTEMPTS + 1));
    clearAllAppData(storage);
    expect(storage.length).toBe(0);
  });
});
