import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { MAIN_CONTENT_ID, SkipLink } from './skip-link';

function Page() {
  return (
    <>
      <SkipLink />
      <nav aria-label="Primary">
        <a href="/a">A</a>
      </nav>
      <main id={MAIN_CONTENT_ID} tabIndex={-1}>
        <h1>Page</h1>
      </main>
    </>
  );
}

describe('SkipLink', () => {
  it('is the first thing Tab reaches', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.tab();

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
  });

  it('moves focus to the main region without changing the address', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe('');
  });

  it('is shown when focused and hidden otherwise', () => {
    render(<SkipLink />);

    const link = screen.getByRole('link', { name: 'Skip to main content' });

    expect(link).toHaveClass('sr-only', 'focus:not-sr-only');
  });

  it('has no detectable violations', async () => {
    const { container } = render(<Page />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
