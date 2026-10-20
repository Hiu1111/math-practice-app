import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../app/AppProvider';
import type { AppStore } from '../app/appStore';
import { AppRoutes } from '../app/AppRoutes';

/**
 * Render the full app at a given route. A new store is created from
 * localStorage each time, so rendering again after unmount() behaves like
 * reopening the browser.
 */
export function renderApp(route = '/', { store }: { store?: AppStore } = {}) {
  const user = userEvent.setup();
  const result = render(
    <AppProvider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  );
  return { user, ...result };
}
