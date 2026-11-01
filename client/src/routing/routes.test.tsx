import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { createMemoryRouter, matchPath, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { appRoutes } from '@/routing/app-routes';
import { publicRoutes } from '@/routing/public-routes';
import { PUBLIC_ROUTE_TABLE } from '@/routing/public-route-table';

const SITE = 'Muhammad Bux Brohi';

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);

  return { router, ...view };
}

// [address, main heading, document title]
const publicPages = [
  ['/', 'Home', `${SITE} | Full Stack Developer`],
  ['/about', 'About', `About | ${SITE}`],
  ['/skills', 'Skills', `Skills | ${SITE}`],
  ['/experience', 'Experience', `Experience | ${SITE}`],
  ['/education', 'Education', `Education | ${SITE}`],
  ['/certifications', 'Certifications', `Certifications | ${SITE}`],
  ['/projects', 'Projects', `Projects | ${SITE}`],
  ['/projects/my-first-project', 'Project', `Project | ${SITE}`],
  ['/blog', 'Blog', `Blog | ${SITE}`],
  ['/blog/my-first-article', 'Article', `Article | ${SITE}`],
  ['/contact', 'Contact', `Contact | ${SITE}`],
] as const;

const adminPages = [
  ['/admin/sign-in', 'Sign in', `Sign in | Admin | ${SITE}`],
  ['/admin', 'Dashboard', `Dashboard | Admin | ${SITE}`],
  ['/admin/projects', 'Manage projects', `Manage projects | Admin | ${SITE}`],
  ['/admin/skills', 'Manage skills', `Manage skills | Admin | ${SITE}`],
  ['/admin/experience', 'Manage experience', `Manage experience | Admin | ${SITE}`],
  ['/admin/education', 'Manage education', `Manage education | Admin | ${SITE}`],
  ['/admin/certifications', 'Manage certifications', `Manage certifications | Admin | ${SITE}`],
  ['/admin/articles', 'Manage articles', `Manage articles | Admin | ${SITE}`],
  ['/admin/messages', 'Messages', `Messages | Admin | ${SITE}`],
  ['/admin/settings', 'Settings', `Settings | Admin | ${SITE}`],
  ['/admin/account', 'Account', `Account | Admin | ${SITE}`],
] as const;

describe('public routes', () => {
  it.each(publicPages)('%s renders its page shell and title', async (path, heading, title) => {
    renderAt(path);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(title));
  });

  it('is built from the public route table, one route per entry', () => {
    expect(publicRoutes.map((route) => route.path)).toEqual(
      PUBLIC_ROUTE_TABLE.map((route) => route.path),
    );
  });

  it('is covered by a test address for every entry of the public route table', () => {
    for (const { path } of PUBLIC_ROUTE_TABLE) {
      expect(publicPages.some(([testedPath]) => matchPath(path, testedPath) !== null)).toBe(true);
    }
  });
});

describe('admin routes', () => {
  it.each(adminPages)('%s renders its page shell and title', async (path, heading, title) => {
    renderAt(path);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(title));
  });
});

describe('not-found route', () => {
  it.each(['/no-such-page', '/about/extra', '/projects/a/b', '/admin/no-such-page'])(
    '%s shows the not-found page',
    async (path) => {
      renderAt(path);

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
      ).toBeInTheDocument();
      await waitFor(() => expect(document.title).toBe(`Page not found | ${SITE}`));
    },
  );
});

describe('accessibility', () => {
  it.each([...publicPages, ...adminPages, ['/no-such-page', 'Page not found', ''] as const])(
    '%s has no detectable violations',
    async (path, heading) => {
      const { container } = renderAt(path);

      await screen.findByRole('heading', { level: 1, name: heading });

      expect((await axe(container)).violations).toEqual([]);
    },
  );
});
