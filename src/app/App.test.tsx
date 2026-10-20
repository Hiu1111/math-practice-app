import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the home page inside the browser router', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /let's practice math/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /math practice/i })).toHaveAttribute('href', '/');
  });
});
