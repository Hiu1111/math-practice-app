import { useEffect, useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { ErrorState } from '../components/common/ErrorState';
import { AppProvider } from './AppProvider';
import { preloadLazyPages, routes } from './routes';

/** Root component: provides saved app data and routing for the whole app. */
export default function App() {
  const [router] = useState(() => createBrowserRouter(routes));

  // Once the first page is showing and the browser is idle, fetch the pages
  // that were split out, so opening them later is instant.
  useEffect(() => {
    const preload = () => void preloadLazyPages().catch(() => {});
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 1500);
    return () => clearTimeout(id);
  }, []);
  return (
    <ErrorBoundary fallback={<ErrorState />}>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </ErrorBoundary>
  );
}
