import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { setScreen, VIEWPORTS } from '@/test/viewport';
import { AdminLayout } from './admin-layout/admin-layout';
import { renderLayout } from './layout-test-utils';
import { PublicLayout } from './public-layout/public-layout';
import { SignInLayout } from './sign-in-layout/sign-in-layout';

/*
 * jsdom has no layout engine, so these tests cannot measure pixels. At each width they check the
 * three things that can be checked here: the page has no violations and every control is still
 * present, the menu works the same way, and each layout carries the responsive classes that
 * give it its shape at that width (FR-RESP-001 to 007). `docs/DESIGN_SYSTEM.md` names the
 * breakpoints: `tablet:` from 48rem and `desktop:` from 64rem. The pixel result is checked by eye
 * in the component gallery, at a phone width (see the review checklist of M3.5).
 */
const widths = Object.entries(VIEWPORTS) as [keyof typeof VIEWPORTS, number][];

const layouts = {
  public: {
    path: '/projects',
    layout: (page: React.ReactNode) => <PublicLayout>{page}</PublicLayout>,
    controls: ['Menu'],
    links: 12, // skip link, brand, nine areas, footer Contact
  },
  admin: {
    path: '/admin/skills',
    layout: (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>,
    controls: ['Menu', 'Sign out'],
    links: 9 + 1,
  },
  'sign-in': {
    path: '/admin/sign-in',
    layout: (page: React.ReactNode) => <SignInLayout>{page}</SignInLayout>,
    controls: [],
    links: 1,
  },
} as const;

describe.each(widths)('at the %s width (%ipx)', (_name, width) => {
  describe.each(Object.entries(layouts))('the %s layout', (_layoutName, definition) => {
    it('has no detectable violations and keeps all of its controls', async () => {
      setScreen({ width });
      const { container } = renderLayout(definition.layout, definition.path);

      expect((await axe(container)).violations).toEqual([]);
      expect(screen.getByRole('heading', { level: 1, name: 'Page heading' })).toBeInTheDocument();
      for (const control of definition.controls) {
        expect(screen.getByRole('button', { name: control })).toBeInTheDocument();
      }
      expect(screen.getAllByRole('link')).toHaveLength(definition.links);
    });
  });

  it('lets the menu be used the same way at this width (public and admin layouts)', async () => {
    setScreen({ width });
    const user = userEvent.setup();

    for (const name of ['public', 'admin'] as const) {
      const { unmount } = renderLayout(layouts[name].layout, layouts[name].path);
      const button = screen.getByRole('button', { name: 'Menu' });

      await user.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await user.keyboard('{Escape}');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      unmount();
    }
  });
});

describe('responsive classes', () => {
  it('public layout: menu below desktop, inline navigation and a footer row from tablet up', () => {
    renderLayout(layouts.public.layout, '/');

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveClass('desktop:hidden');
    expect(screen.getByRole('navigation', { name: 'Primary' })).toHaveClass(
      'desktop:block',
      'w-full',
    );
    expect(screen.getByRole('contentinfo').firstElementChild).toHaveClass('tablet:flex-row');
  });

  it('public layout: keeps text lines readable on wide screens with a maximum width', () => {
    renderLayout(layouts.public.layout, '/');

    expect(screen.getByRole('main')).toHaveClass('mx-auto', 'max-w-6xl');
  });

  it('admin layout: a column beside the page on a desktop, stacked below it', () => {
    renderLayout(layouts.admin.layout, '/admin');

    expect(screen.getByRole('navigation', { name: 'Admin' })).toHaveClass('desktop:w-1/5');
    expect(screen.getByRole('main').parentElement).toHaveClass('flex-col', 'desktop:flex-row');
  });

  it('admin layout: Sign out stays in the always-visible header, so a phone can use it', () => {
    renderLayout(layouts.admin.layout, '/admin');

    expect(screen.getByRole('banner')).toContainElement(
      screen.getByRole('button', { name: 'Sign out' }),
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).not.toHaveClass('hidden');
  });

  it('sign-in layout: fills a phone and stops at a maximum width', () => {
    renderLayout(layouts['sign-in'].layout, '/admin/sign-in');

    expect(screen.getByRole('main')).toHaveClass('w-full', 'max-w-md');
  });

  it('every layout control is at least 48px high, for touch (FR-RESP-004)', () => {
    renderLayout(layouts.admin.layout, '/admin');

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('min-h-12');
    }
    for (const link of screen.getAllByRole('link').filter((item) => item.closest('nav'))) {
      expect(link).toHaveClass('min-h-12');
    }
  });
});
