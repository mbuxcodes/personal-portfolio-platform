import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PUBLIC_NAVIGATION } from '@/layouts';
import { appRoutes } from './app-routes';
import { PUBLIC_ROUTE_TABLE } from './public-route-table';

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });

  return { router, ...render(<RouterProvider router={router} />) };
}

describe('layouts in the routes', () => {
  it('links the public navigation only to addresses in the public route table', () => {
    const tablePaths: readonly string[] = PUBLIC_ROUTE_TABLE.map((route) => route.path);

    for (const item of PUBLIC_NAVIGATION) {
      expect(tablePaths).toContain(item.to);
    }
  });

  it.each(['/', '/about', '/projects', '/projects/some-project', '/blog/some-article', '/contact'])(
    'puts %s in the public layout',
    async (path) => {
      renderAt(path);

      await screen.findByRole('heading', { level: 1 });

      expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    },
  );

  it.each([
    '/admin',
    '/admin/projects',
    '/admin/skills',
    '/admin/experience',
    '/admin/education',
    '/admin/certifications',
    '/admin/articles',
    '/admin/messages',
    '/admin/settings',
    '/admin/account',
  ])('puts %s in the admin layout, with Sign out', async (path) => {
    renderAt(path);

    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByRole('navigation', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
  });

  it('puts the sign-in page in the sign-in layout, with no navigation and no Sign out', async () => {
    renderAt('/admin/sign-in');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows the not-found page inside the public layout, with a way home (no dead end)', async () => {
    renderAt('/no-such-page');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Go to the home page' })).toHaveLength(1);
  });

  it('keeps the layout mounted while moving between pages, so menu focus is not lost', async () => {
    const user = userEvent.setup();
    renderAt('/about');
    await screen.findByRole('heading', { level: 1, name: 'About' });
    const nav = screen.getByRole('navigation', { name: 'Primary' });

    await user.click(screen.getByRole('link', { name: 'Skills' }));

    await screen.findByRole('heading', { level: 1, name: 'Skills' });
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBe(nav);
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps one h1 and focuses it after a page change', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.click(screen.getByRole('link', { name: 'About' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'About' })).toHaveFocus(),
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it.each(['/skills', '/admin/skills', '/admin/sign-in', '/no-such-page'])(
    '%s has no detectable violations inside its layout',
    async (path) => {
      const { container } = renderAt(path);

      await screen.findByRole('heading', { level: 1 });

      expect((await axe(container)).violations).toEqual([]);
    },
  );
});
