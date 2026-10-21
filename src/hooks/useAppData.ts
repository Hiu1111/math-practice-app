import { useContext, useSyncExternalStore } from 'react';
import type { AppDataState, AppStore } from '../app/appStore';
import { AppStoreContext } from '../app/appStoreContext';

/** The app store, for calling actions such as recordAttempt or updateSettings. */
export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useAppStore must be used inside <AppProvider>');
  return store;
}

/**
 * One piece of the saved data, e.g. `useAppData((s) => s.settings)`.
 * The component re-renders only when that piece changes, not on every save:
 * answering a question replaces `attempts` and `statistics`, but leaves
 * `settings` untouched, so a component that only reads settings stays put.
 *
 * The selector must return a value already in the state (or a primitive);
 * building a new object or array inside it would re-render on every change.
 */
export function useAppData<T>(selector: (state: AppDataState) => T): T {
  const store = useAppStore();
  const select = () => selector(store.getState());
  return useSyncExternalStore(store.subscribe, select, select);
}
