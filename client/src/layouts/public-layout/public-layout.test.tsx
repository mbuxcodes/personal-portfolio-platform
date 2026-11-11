import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { renderLayout } from '../layout-test-utils';
import { PublicLayout } from './public-layout';

const renderPublic = (path = '/') =>
  renderLayout((page) => <PublicLayout>{page}</PublicLayout>, path);

const AREAS = [
  'Home',
  'About',
  'Skills',
  'Experience',
  'Education',
  'Projects',
  'Certifications',
  'Blog',
  'Contact',
];

describe('PublicLayout', () => {
  it('has the banner, navigation, main and footer landmarks', () => {
    renderPublic();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Page heading' }),
    );
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('links to all nine public areas, in order (FR-SITE-001)', () => {
    renderPublic();

    const links = within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual(AREAS);
  });

  it('marks the current area, and only that one', () => {
    renderPublic('/skills');

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');

    expect(current.map((link) => link.textContent)).toEqual(['Skills']);
  });

  it('marks Home only on the Home page', () => {
    renderPublic('/');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps an area marked as current on its detail pages (FR-SITE-001 AC2)', () => {
    renderPublic('/projects/my-first-project');

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('shows the current area by more than color', () => {
    renderPublic('/about');

    expect(screen.getByRole('link', { name: 'About' }).className).toContain('underline');
    expect(screen.getByRole('link', { name: 'Skills' }).className).not.toContain(' underline');
  });

  it('shows the footer on every page with the owner name', () => {
    renderPublic();

    expect(screen.getByRole('contentinfo')).toHaveTextContent('Muhammad Bux Brohi');
  });

  it('makes the first Tab stop the skip link, then the brand, then the navigation', async () => {
    const user = userEvent.setup();
    renderPublic();

    await user.tab();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Muhammad Bux Brohi' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
  });

  it('moves through every navigation link with Tab', async () => {
    const user = userEvent.setup();
    renderPublic();

    const nav = within(screen.getByRole('navigation', { name: 'Primary' }));

    nav.getByRole('link', { name: 'Home' }).focus();
    for (const area of AREAS.slice(1)) {
      await user.tab();
      expect(nav.getByRole('link', { name: area })).toHaveFocus();
    }
  });

  it('opens the menu on the menu button and reports it with aria-expanded', async () => {
    const user = userEvent.setup();
    renderPublic();
    const button = screen.getByRole('button', { name: 'Menu' });
    const nav = screen.getByRole('navigation', { name: 'Primary' });

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', nav.id);
    expect(nav.className).toContain('hidden');

    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(nav.className).toContain('block');
    expect(nav.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it('opens the menu from the keyboard and closes it with Escape, returning focus to the button', async () => {
    const user = userEvent.setup();
    renderPublic();
    const button = screen.getByRole('button', { name: 'Menu' });

    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.tab();
    await user.keyboard('{Escape}');

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('closes the menu when a different page is opened', async () => {
    const user = userEvent.setup();
    const { router } = renderPublic();

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await act(() => router.navigate('/about'));

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('hides the menu button on a desktop and shows the navigation inline', () => {
    renderPublic();

    expect(screen.getByRole('button', { name: 'Menu' }).className).toContain('desktop:hidden');
    expect(screen.getByRole('navigation', { name: 'Primary' }).className).toContain(
      'desktop:block',
    );
  });

  it('has no detectable violations, closed or open', async () => {
    const user = userEvent.setup();
    const { container } = renderPublic('/about');

    expect((await axe(container)).violations).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Menu' }));

    expect((await axe(container)).violations).toEqual([]);
  });
});
