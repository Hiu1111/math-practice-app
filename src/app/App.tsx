import { useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppProvider } from './AppProvider';
import { routes } from './routes';

/** Root component: provides saved app data and routing for the whole app. */
export default function App() {
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}
