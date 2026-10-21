import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { StorageWarning } from './StorageWarning';

/** Frame shared by every page: skip link, header, main content area and footer. */
export function AppLayout() {
  const { pathname } = useLocation();

  // Start each new page at the top.
  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="app-main" tabIndex={-1}>
        <StorageWarning />
        <Outlet />
      </main>
      <footer className="site-footer">
        Your progress is saved only in this browser. Clearing your browser data will erase it.
      </footer>
    </>
  );
}
