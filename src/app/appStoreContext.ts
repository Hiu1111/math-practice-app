import { createContext } from 'react';
import type { AppStore } from './appStore';

/** Holds the single app store for the whole component tree (see AppProvider). */
export const AppStoreContext = createContext<AppStore | null>(null);
