import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PracticePage } from '../pages/PracticePage';
import { PracticeSetupPage } from '../pages/PracticeSetupPage';
import { SessionSummaryPage } from '../pages/SessionSummaryPage';
import { SettingsPage } from '../pages/SettingsPage';
import { StatisticsPage } from '../pages/StatisticsPage';

/** All application routes (spec §16). Unknown paths render a friendly 404 page. */
export function AppRoutes() {
  return (
    <Routes>
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
      </Route>
    </Routes>
  );
}
