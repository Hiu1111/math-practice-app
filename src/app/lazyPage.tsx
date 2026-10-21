import { lazy, Suspense, type ComponentType } from 'react';

export interface LazyPage {
  (): React.JSX.Element;
  /** Start downloading the page's code now (safe to call many times). */
  preload: () => Promise<void>;
}

/**
 * A page whose code is downloaded only when it is first needed (TODO task 85),
 * so the first visit loads less JavaScript.
 *
 * `preload()` fetches it ahead of time (the app does this once the browser is
 * idle), after which the page renders immediately with no loading state.
 * If the download fails (offline, or a new version was deployed), the error
 * reaches the router's friendly error page, and the next attempt tries again.
 */
export function lazyPage(load: () => Promise<ComponentType>): LazyPage {
  let Loaded: ComponentType | null = null;
  let pending: Promise<void> | null = null;

  const preload = () =>
    (pending ??= load().then(
      (component) => {
        Loaded = component;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      },
    ));

  const LazyComponent = lazy(() => preload().then(() => ({ default: Loaded! })));

  function Page() {
    if (Loaded) return <Loaded />;
    return (
      <Suspense
        fallback={
          <p className="page-loading" role="status">
            Loading…
          </p>
        }
      >
        <LazyComponent />
      </Suspense>
    );
  }
  Page.preload = preload;
  return Page;
}
