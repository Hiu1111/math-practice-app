import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the application title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /math practice/i })).toBeInTheDocument();
  });

  it('renders a welcome message', () => {
    render(<App />);
    expect(screen.getByText(/practice some math/i)).toBeInTheDocument();
  });
});
