import { render, screen } from '@testing-library/react';
import { lazyPage } from './lazyPage';

function Ready() {
  return <h1>Statistics</h1>;
}

describe('lazyPage (task 85)', () => {
  it('shows a short loading message while the page downloads, then the page', async () => {
    let finish!: (c: typeof Ready) => void;
    const Page = lazyPage(() => new Promise((resolve) => (finish = resolve)));
    render(<Page />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    finish(Ready);
    expect(await screen.findByRole('heading', { name: 'Statistics' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders immediately, with no loading state, once preloaded', async () => {
    const load = vi.fn(() => Promise.resolve(Ready));
    const Page = lazyPage(load);
    await Page.preload();
    await Page.preload();
    expect(load).toHaveBeenCalledTimes(1); // downloaded once
    render(<Page />);
    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument();
  });

  it('lets a failed download be tried again', async () => {
    const load = vi
      .fn<() => Promise<typeof Ready>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(Ready);
    const Page = lazyPage(load);
    await expect(Page.preload()).rejects.toThrow('offline');
    await Page.preload();
    expect(load).toHaveBeenCalledTimes(2);
    render(<Page />);
    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument();
  });
});
