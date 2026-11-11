import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Button } from '@/shared-ui/button';
import { SiteName } from '@/shared-ui/brand';
import { RegionErrorBoundary } from '@/shared-ui/error-boundary';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared-ui/skip-link';
import { useMenu } from '../use-menu';
import { ADMIN_NAVIGATION } from './admin-navigation';

const NAVIGATION_ID = 'admin-navigation';

export interface AdminLayoutProps {
  children: ReactNode;
  /**
   * Called when the Admin presses Sign out. Authentication is built in M5, so for now nothing
   * is passed and the button does nothing. The button is always present, on every page and at
   * every width (FR-AUTH-007).
   */
  onSignOut?: () => void;
}

/**
 * The frame of every admin management page: a header with the Sign out control, a navigation
 * to every management area, and the page's main region.
 *
 * - Sign out sits in the header, which is always visible, so it is reachable on a phone
 *   without opening the menu (FR-RESP-005).
 * - On a desktop the navigation is a column beside the page. Below that width it folds behind a
 *   menu button that reports `aria-expanded` and closes on Escape or after a page change.
 * - The current area carries `aria-current="page"` and is filled, not only colored.
 */
export function AdminLayout({ children, onSignOut }: AdminLayoutProps) {
  const { pathname } = useLocation();
  const { isOpen, toggle, buttonRef } = useMenu();

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header data-surface="inverse" className="bg-surface-inverse text-text-inverse">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 tablet:px-6">
          <p className="text-body-lg font-semibold">
            <SiteName /> <span className="font-regular text-text-inverse-secondary">Admin</span>
          </p>
          <div className="flex items-center gap-3">
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
            <Button variant="secondary" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col desktop:flex-row">
        <nav
          id={NAVIGATION_ID}
          aria-label="Admin"
          className={`bg-surface-muted p-4 desktop:block desktop:w-1/5 desktop:shrink-0 ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          <ul className="flex flex-col gap-1">
            {ADMIN_NAVIGATION.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block min-h-12 rounded-md px-3 py-3 text-body-sm font-medium no-underline ${
                      isActive
                        ? 'bg-surface-inverse text-text-inverse'
                        : 'text-text-primary hover:bg-accent hover:text-text-on-accent'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="min-w-0 flex-1 p-4 tablet:p-6 desktop:p-8"
        >
          <RegionErrorBoundary resetKey={pathname} regionName="this page">
            {children}
          </RegionErrorBoundary>
        </main>
      </div>
    </div>
  );
}
