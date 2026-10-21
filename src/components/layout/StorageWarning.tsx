import { useAppData, useAppStore } from '../../hooks/useAppData';
import type { DataCategory } from '../../services/storageService';
import { Button } from '../common/Button';

/** Plain-language names for each kind of saved data. */
const CATEGORY_NAMES: Record<DataCategory, string> = {
  settings: 'your settings',
  sessions: 'your practice history',
  attempts: 'your practice history',
  statistics: 'your statistics',
  mistakePatterns: 'your saved mistakes',
};

function listNames(categories: readonly DataCategory[]): string {
  const names = [...new Set(categories.map((c) => CATEGORY_NAMES[c]))];
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Friendly notices about saved data (spec sections 11 and 17, TODO task 78):
 * - progress cannot be saved (storage unavailable or full); practice still works
 * - some saved data could not be read when the app opened and was reset
 */
export function StorageWarning() {
  const storageStatus = useAppData((s) => s.storageStatus);
  const repairedOnLoad = useAppData((s) => s.repairedOnLoad);
  const store = useAppStore();

  return (
    <>
      {storageStatus !== 'ok' && (
        <div className="storage-warning" role="status">
          <span aria-hidden="true">⚠️</span>
          <p>
            {storageStatus === 'unavailable'
              ? 'This browser is not letting the app save your progress (this can happen in private browsing). You can still practice, but your scores will not be kept.'
              : 'We could not save your latest progress. Your device may be out of space. You can keep practicing.'}
          </p>
        </div>
      )}
      {repairedOnLoad.length > 0 && (
        <div className="storage-warning storage-warning--info" role="status">
          <span aria-hidden="true">🧹</span>
          <p>
            Some saved information could not be read, so {listNames(repairedOnLoad)} had to be
            reset. Everything else is safe.
          </p>
          <Button variant="secondary" onClick={store.dismissRepairNotice}>
            OK
          </Button>
        </div>
      )}
    </>
  );
}
