import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, type InitialEntry } from 'react-router';
import { AppProvider } from '../app/AppProvider';
import type { AppStore } from '../app/appStore';
import { routes } from '../app/routes';

/**
 * Render the full app at a given route (a path, or a location with state and
 * key). A new store is created from localStorage each time, so rendering again
 * after unmount() behaves like reopening the browser.
 */
export function renderApp(entry: InitialEntry = '/', { store }: { store?: AppStore } = {}) {
  const user = userEvent.setup();
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  const result = render(
    <AppProvider store={store}>
      <RouterProvider router={router} />
    </AppProvider>,
  );
  return { user, router, ...result };
}
