import { useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { ErrorState } from '../components/common/ErrorState';
import { AppProvider } from './AppProvider';
import { routes } from './routes';

/** Root component: provides saved app data and routing for the whole app. */
export default function App() {
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <ErrorBoundary fallback={<ErrorState />}>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </ErrorBoundary>
  );
}
