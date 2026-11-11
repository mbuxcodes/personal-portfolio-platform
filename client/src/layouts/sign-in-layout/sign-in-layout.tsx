import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { SiteName } from '@/shared-ui/brand';
import { RegionErrorBoundary } from '@/shared-ui/error-boundary';
import { MAIN_CONTENT_ID, SkipLink } from '@/shared-ui/skip-link';

/**
 * The frame of the sign-in page and of any later page that sits outside a session (for
 * example, an expired session notice): a single centered card on a quiet background.
 *
 * It adds no heading of its own. The page puts its `h1` first inside the card, so the page keeps
 * exactly one `h1` and a clean outline (FR-A11Y-004). It has no navigation, because the Admin
 * area is never linked from the public site and a visitor who is not signed in has nowhere to go
 * inside it (FR-AUTH-008). On a phone the card fills the width, and it grows to a fixed maximum
 * on larger screens.
 */
export function SignInLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <SkipLink />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="m-auto flex w-full max-w-md flex-col gap-6 px-4 py-12"
      >
        <p className="text-center text-body-lg font-semibold text-text-primary">
          <SiteName />
        </p>
        <div className="rounded-lg border border-border bg-surface p-6 tablet:p-8">
          <RegionErrorBoundary resetKey={pathname} regionName="the sign-in form">
            {children}
          </RegionErrorBoundary>
        </div>
      </main>
    </div>
  );
}
