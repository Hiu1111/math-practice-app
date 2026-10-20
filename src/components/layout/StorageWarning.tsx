import { useAppData } from '../../hooks/useAppData';

/**
 * Friendly notice when progress cannot be saved (spec section 11, storage failure).
 * Practice still works; only saving is affected.
 */
export function StorageWarning() {
  const { storageStatus } = useAppData();
  if (storageStatus === 'ok') return null;

  return (
    <div className="storage-warning" role="status">
      <span aria-hidden="true">⚠️</span>
      <p>
        {storageStatus === 'unavailable'
          ? 'This browser is not letting the app save your progress (this can happen in private browsing). You can still practice, but your scores will not be kept.'
          : 'We could not save your latest progress. Your device may be out of space. You can keep practicing.'}
      </p>
    </div>
  );
}
