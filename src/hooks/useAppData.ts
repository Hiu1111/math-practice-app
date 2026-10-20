import { useContext, useSyncExternalStore } from 'react';
import type { AppDataState, AppStore } from '../app/appStore';
import { AppStoreContext } from '../app/appStoreContext';

/** The app store, for calling actions such as recordAttempt or updateSettings. */
export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useAppStore must be used inside <AppProvider>');
  return store;
}

/** The current saved data; re-renders the component whenever it changes. */
export function useAppData(): AppDataState {
  const store = useAppStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
