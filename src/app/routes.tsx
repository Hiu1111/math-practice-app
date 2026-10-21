import { Navigate, Route, createRoutesFromElements } from 'react-router';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PracticePage } from '../pages/PracticePage';
import { PracticeSetupPage } from '../pages/PracticeSetupPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { SessionSummaryPage } from '../pages/SessionSummaryPage';
import { lazyPage } from './lazyPage';

// Statistics and Settings are not needed to start practicing, so their code is
// split out of the first download and fetched when first needed (TODO task 85).
const StatisticsPage = lazyPage(() =>
  import('../pages/StatisticsPage').then((m) => m.StatisticsPage),
);
const SettingsPage = lazyPage(() => import('../pages/SettingsPage').then((m) => m.SettingsPage));

/** Fetch the code of every lazily loaded page (when idle, and before tests). */
export function preloadLazyPages(): Promise<void[]> {
  return Promise.all([StatisticsPage.preload(), SettingsPage.preload()]);
}

/**
 * All application routes (spec 16). Used with a data router
 * (createBrowserRouter in the app, createMemoryRouter in tests), which is what
 * lets the practice page ask before the student leaves an active session.
 * Unknown paths render a friendly 404 page.
 */
export const routes = createRoutesFromElements(
  <Route element={<AppLayout />} errorElement={<RouteErrorPage />}>
    <Route index element={<HomePage />} />
    <Route path="practice">
      <Route index element={<Navigate to="setup" replace />} />
      <Route path="setup" element={<PracticeSetupPage />} />
      <Route path="session" element={<PracticePage />} />
      <Route path="summary" element={<SessionSummaryPage />} />
    </Route>
    <Route path="statistics" element={<StatisticsPage />} />
    <Route path="settings" element={<SettingsPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>,
);
