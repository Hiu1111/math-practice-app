import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { ErrorState } from '../components/common/ErrorState';

/**
 * Shown by the router when a page throws while rendering (TODO task 78).
 * It replaces the whole layout, so it brings its own simple header.
 */
export function RouteErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    document.title = 'Something went wrong · Math Practice';
    if (import.meta.env.DEV) console.error('[RouteErrorPage]', error);
  }, [error]);

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <a href="/" className="brand">
            <span className="brand__logo" aria-hidden="true">
              🧮
            </span>
            <span>Math Practice</span>
          </a>
        </div>
      </header>
      <main id="main-content" className="app-main">
        <div className="page page--narrow">
          <ErrorState />
        </div>
      </main>
    </>
  );
}
