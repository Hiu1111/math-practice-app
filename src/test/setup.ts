import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { preloadLazyPages } from '../app/routes';

// jsdom does not implement scrolling; stub it so layout effects stay quiet.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// Load the code-split pages up front so tests can render every route synchronously
// (lazyPage.test.tsx covers the loading state itself).
beforeAll(() => preloadLazyPages());

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
