import { screen, within } from '@testing-library/react';
import { renderApp } from '../test/renderApp';

describe('home page', () => {
  it('shows a welcome message and the three main actions', () => {
    renderApp('/');
    expect(
      screen.getByRole('heading', { level: 1, name: /let's practice math/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/watch yourself get better/i)).toBeInTheDocument();

    const hero = screen.getByRole('region', { name: /let's practice math/i });
    expect(within(hero).getByRole('link', { name: /start practice/i })).toHaveAttribute(
      'href',
      '/practice/setup',
    );
    expect(within(hero).getByRole('link', { name: /view statistics/i })).toHaveAttribute(
      'href',
      '/statistics',
    );
    expect(within(hero).getByRole('link', { name: /settings/i })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('opens the practice setup page from Start Practice', async () => {
    const { user } = renderApp('/');
    const hero = screen.getByRole('region', { name: /let's practice math/i });
    await user.click(within(hero).getByRole('link', { name: /start practice/i }));
    expect(screen.getByRole('heading', { level: 1, name: /get ready/i })).toBeInTheDocument();
  });

  it('reaches the home-page actions with the keyboard', async () => {
    const { user } = renderApp('/');
    const hero = screen.getByRole('region', { name: /let's practice math/i });
    const start = within(hero).getByRole('link', { name: /start practice/i });
    // Tab until the Start Practice link is focused (skip link, brand and nav come first).
    for (let i = 0; i < 10 && document.activeElement !== start; i++) {
      await user.tab();
    }
    expect(start).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 1, name: /get ready/i })).toBeInTheDocument();
  });
});

describe('routing', () => {
  it.each([
    ['/statistics', /statistics/i],
    ['/settings', /settings/i],
    ['/practice/summary', /session summary/i],
  ])('renders %s', (route, heading) => {
    renderApp(route);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('redirects /practice to the setup page', () => {
    renderApp('/practice');
    expect(screen.getByRole('heading', { level: 1, name: /get ready/i })).toBeInTheDocument();
  });

  it('shows a friendly page for unknown routes', () => {
    renderApp('/this/does/not/exist');
    expect(screen.getByText(/this page got lost/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
  });

  it('marks the current section in the navigation, including nested practice routes', () => {
    renderApp('/practice/setup');
    const nav = screen.getByRole('navigation', { name: /main/i });
    expect(within(nav).getByRole('link', { name: /practice/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: /home/i })).not.toHaveAttribute('aria-current');
  });
});
