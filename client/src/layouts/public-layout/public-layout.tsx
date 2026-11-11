import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { BrandLink, SiteName } from '@/shared-ui/brand';
import { Button } from '@/shared-ui/button';
import { RegionErrorBoundary } from '@/shared-ui/error-boundary';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared-ui/skip-link';
import { useMenu } from '../use-menu';
import { PUBLIC_NAVIGATION } from './public-navigation';

const NAVIGATION_ID = 'public-navigation';

/**
 * The frame of every public page: skip link, header with navigation to all nine areas
 * (FR-SITE-001), the page's main region, and the footer (FR-SITE-002).
 *
 * - The current area carries `aria-current="page"` (set by `NavLink`) and is also underlined,
 *   so it is not shown by color alone.
 * - Below the desktop width the navigation folds behind a menu button, because nine links do not
 *   fit on one line on a phone or tablet. The button reports `aria-expanded`.
 * - The page is drawn inside a region error boundary. If a page fails, the header and footer
 *   stay, and the failure message offers a retry (FR-ERR-007).
 *
 * The footer shows the owner's name. The professional links and contact details the Admin
 * chooses (FR-SITE-002 AC2, AC3) come from Settings in a later milestone.
 */
export function PublicLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { isOpen, toggle, buttonRef } = useMenu();

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header data-surface="inverse" className="bg-surface-inverse text-text-inverse">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 tablet:px-6">
          <BrandLink className="rounded-md py-2 text-body-lg font-semibold text-text-inverse no-underline" />
          <Button
            ref={buttonRef}
            variant="secondary"
            className="desktop:hidden"
            aria-expanded={isOpen}
            aria-controls={NAVIGATION_ID}
            onClick={toggle}
          >
            Menu
          </Button>
          <nav
            id={NAVIGATION_ID}
            aria-label="Primary"
            className={`w-full desktop:block desktop:w-auto ${isOpen ? 'block' : 'hidden'}`}
          >
            <ul className="flex flex-col gap-1 desktop:flex-row desktop:gap-2">
              {PUBLIC_NAVIGATION.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block min-h-12 rounded-md px-3 py-3 text-body-sm font-medium ${
                        isActive
                          ? 'text-accent underline underline-offset-4'
                          : 'text-text-inverse no-underline hover:text-accent'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 p-4 tablet:p-6 desktop:p-8"
      >
        <RegionErrorBoundary resetKey={pathname} regionName="this page">
          {children}
        </RegionErrorBoundary>
      </main>

      <footer className="bg-surface-muted text-text-secondary">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 tablet:flex-row tablet:items-center tablet:justify-between tablet:px-6">
          <p>
            © {new Date().getFullYear()} <SiteName />
          </p>
          <nav aria-label="Footer">
            <Link to="/contact" className="inline-block py-2">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
