import { Link } from 'react-router';
import { Navigation } from './Navigation';

/** Application header with the app title and main navigation. */
export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__logo" aria-hidden="true">
            🧮
          </span>
          <span>Math Practice</span>
        </Link>
        <Navigation />
      </div>
    </header>
  );
}
