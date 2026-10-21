import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router';
import { AppProvider } from '../app/AppProvider';
import { createAppStore } from '../app/appStore';
import { routes } from '../app/routes';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { ErrorState } from '../components/common/ErrorState';
import { STORAGE_KEYS } from '../services/storageService';
import { MemoryStorage } from '../test/memoryStorage';
import { renderApp } from '../test/renderApp';

const SECRET = 'TypeError: cannot read properties of undefined (secret internal detail)';

function Boom(): never {
  throw new Error(SECRET);
}

describe('friendly error page (task 78)', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('shows a friendly page with a safe way home when a page crashes, and no technical details', () => {
    // The real route configuration, with the home page replaced by one that throws.
    const [layout] = routes as RouteObject[];
    const crashing: RouteObject[] = [
      {
        element: layout.element,
        errorElement: layout.errorElement,
        children: [{ index: true, element: <Boom /> }],
      },
    ];
    const router = createMemoryRouter(crashing, { initialEntries: ['/'] });
    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/oops! something went wrong/i);
    expect(screen.getByText(/your saved practice is safe/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/secret internal detail/i);
    expect(document.body).not.toHaveTextContent(/TypeError/);
  });

  it('the outer error boundary catches failures outside the routes', () => {
    render(
      <ErrorBoundary fallback={<ErrorState />}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(document.body).not.toHaveTextContent(/secret internal detail/i);
  });
});

describe('notice when saved data had to be repaired (task 78)', () => {
  it.each([
    [STORAGE_KEYS.mistakePatterns, 'your saved mistakes'],
    [STORAGE_KEYS.settings, 'your settings'],
    [STORAGE_KEYS.attempts, 'your practice history'],
  ])('explains in simple words when %s could not be read', (key, words) => {
    localStorage.setItem(key, '{{ not valid json');
    renderApp('/');
    expect(screen.getByRole('status')).toHaveTextContent(
      new RegExp(`could not be read, so ${words} had to be reset\\. everything else is safe`, 'i'),
    );
  });

  it('can be dismissed, and is not shown when nothing was wrong', async () => {
    localStorage.setItem(STORAGE_KEYS.mistakePatterns, '"broken"');
    const { user, unmount } = renderApp('/');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByText(/could not be read/i)).not.toBeInTheDocument();
    unmount();

    // The repaired data was written back, so the next visit is clean.
    renderApp('/');
    expect(screen.queryByText(/could not be read/i)).not.toBeInTheDocument();
  });

  it('dismissing the notice does not hide a "could not save" warning', () => {
    const storage = new MemoryStorage({ [STORAGE_KEYS.mistakePatterns]: '{bad' });
    const store = createAppStore(storage);
    storage.broken = true;
    store.updateSettings({ soundEffects: true });
    expect(store.getState().storageStatus).toBe('write-failed');
    store.dismissRepairNotice();
    expect(store.getState().repairedOnLoad).toEqual([]);
    expect(store.getState().storageStatus).toBe('write-failed');
  });
});

describe('missing-session and question-generation errors (tasks 77–78)', () => {
  it('explains a missing session simply and offers the way forward', () => {
    renderApp('/practice/session');
    expect(screen.getByRole('status')).toHaveTextContent(/let's set up a practice session first/i);
    expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument();
  });

  it('keeps working (no crash) for every operation even with an unlucky random source', async () => {
    // Math.random stuck at 0 makes every generated question identical; the
    // generator must still hand over valid questions (retry, then fallback).
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, { initialEntries: ['/practice/setup'] });
    render(
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>,
    );
    await user.click(screen.getByRole('button', { name: /mix them all/i }));
    await user.click(screen.getByRole('button', { name: /start session/i }));
    expect(screen.getByRole('group', { name: /answer choices/i })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
