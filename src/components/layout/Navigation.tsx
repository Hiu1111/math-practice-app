import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** Path prefix that marks this item as current (e.g. every /practice/* route). */
  match: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: '🏠', match: '/', exact: true },
  { to: '/practice/setup', label: 'Practice', icon: '✏️', match: '/practice' },
  { to: '/statistics', label: 'Statistics', icon: '📊', match: '/statistics' },
  { to: '/settings', label: 'Settings', icon: '⚙️', match: '/settings' },
];

function isCurrent(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.match;
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}

/** Main site navigation. Highlights the current section, including nested practice routes. */
export function Navigation() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Main">
      <ul className="nav">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="nav__link"
              aria-current={isCurrent(pathname, item) ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
