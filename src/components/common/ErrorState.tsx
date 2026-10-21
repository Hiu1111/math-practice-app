interface ErrorStateProps {
  title?: string;
  message?: string;
}

/**
 * A friendly "something went wrong" message (TODO task 78). It never shows
 * technical details or stack traces. It uses plain links and a full page
 * reload, so it still works when the router or app state is what failed.
 */
export function ErrorState({
  title = 'Oops! Something went wrong.',
  message = 'Your saved practice is safe. Try again, or go back to the home page.',
}: ErrorStateProps) {
  return (
    <div className="empty-state card error-state" role="alert">
      <div className="empty-state__icon" aria-hidden="true">
        🛠️
      </div>
      <h1 className="empty-state__title">{title}</h1>
      <div className="empty-state__text">
        <p>{message}</p>
      </div>
      <div className="error-state__actions">
        <button
          type="button"
          className="btn btn--primary btn--md"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
        <a className="btn btn--secondary btn--md" href="/">
          Go Home
        </a>
      </div>
    </div>
  );
}
