import { Navigate, Route, createRoutesFromElements } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PracticePage } from '../pages/PracticePage';
import { PracticeSetupPage } from '../pages/PracticeSetupPage';
import { SessionSummaryPage } from '../pages/SessionSummaryPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StatisticsPage } from '../pages/StatisticsPage';

/**
 * All application routes (spec 16). Used with a data router
 * (createBrowserRouter in the app, createMemoryRouter in tests), which is what
 * lets the practice page ask before the student leaves an active session.
 * Unknown paths render a friendly 404 page.
 */
export const routes = createRoutesFromElements(
  <Route element={<AppLayout />}>
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
