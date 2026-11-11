import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageErrorBoundary, PageErrorFallback, RegionErrorBoundary } from './error-boundary';

// React logs an error that a boundary catches. The tests expect it, so it is silenced.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Bomb({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error('secret technical detail');
  }

  return <p>All good</p>;
}

function Harness({ region }: { region: boolean }) {
  const [explode, setExplode] = useState(true);
  const Boundary = region ? RegionErrorBoundary : PageErrorBoundary;

  return (
    <>
      <button type="button" onClick={() => setExplode(false)}>
        Fix it
      </button>
      <Boundary>
        <Bomb explode={explode} />
      </Boundary>
    </>
  );
}

describe('RegionErrorBoundary', () => {
  it('shows a friendly message instead of the failed region, and never the error text', () => {
    render(
      <RegionErrorBoundary regionName="the project list">
        <Bomb explode />
      </RegionErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('showing the project list');
    expect(screen.queryByText(/secret technical detail/)).not.toBeInTheDocument();
  });

  it('leaves the rest of the page working', () => {
    render(
      <>
        <p>Navigation</p>
        <RegionErrorBoundary>
          <Bomb explode />
        </RegionErrorBoundary>
      </>,
    );

    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders the content again when Try again is pressed and the cause is gone', async () => {
    const user = userEvent.setup();
    render(<Harness region />);

    await user.click(screen.getByRole('button', { name: 'Fix it' }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the error by itself when the reset key changes', () => {
    const { rerender } = render(
      <RegionErrorBoundary resetKey="/a">
        <Bomb explode />
      </RegionErrorBoundary>,
    );

    rerender(
      <RegionErrorBoundary resetKey="/b">
        <Bomb explode={false} />
      </RegionErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('reports the error once, for logging', () => {
    const onError = vi.fn();
    render(
      <RegionErrorBoundary onError={onError}>
        <Bomb explode />
      </RegionErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('has no detectable violations in its failed state', async () => {
    const { container } = render(
      <RegionErrorBoundary>
        <Bomb explode />
      </RegionErrorBoundary>,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('PageErrorBoundary', () => {
  it('is never a blank page: it has a main region, one h1, a retry and a way home', () => {
    render(
      <PageErrorBoundary>
        <Bomb explode />
      </PageErrorBoundary>,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
  });

  it('renders the page again when Try again is pressed and the cause is gone', async () => {
    const user = userEvent.setup();
    render(<Harness region={false} />);

    await user.click(screen.getByRole('button', { name: 'Fix it' }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('has no detectable violations in its failed state', async () => {
    const { container } = render(<PageErrorFallback onRetry={vi.fn()} homeHref="/" />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
