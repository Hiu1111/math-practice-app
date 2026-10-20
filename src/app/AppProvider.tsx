import { useState, type ReactNode } from 'react';
import { createAppStore, type AppStore } from './appStore';
import { AppStoreContext } from './appStoreContext';

interface AppProviderProps {
  children: ReactNode;
  /** Inject a store (tests); by default one is created from the browser's localStorage. */
  store?: AppStore;
}

/** Makes saved settings, history and statistics available to every page. */
export function AppProvider({ children, store }: AppProviderProps) {
  const [value] = useState(() => store ?? createAppStore());
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}
