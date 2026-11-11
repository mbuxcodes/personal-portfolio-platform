import { Outlet } from 'react-router';
import { NotFoundPage } from '@/features/public/not-found';
import { AdminLayout, PublicLayout, SignInLayout } from '@/layouts';

/** Puts the public pages inside the public layout. */
export function PublicLayoutRoute() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}

/**
 * Puts the admin management pages inside the admin layout. Sign-out is a placeholder until
 * authentication is built (M5), so no handler is passed yet.
 */
export function AdminLayoutRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

/** Puts the sign-in page inside the sign-in layout. */
export function SignInLayoutRoute() {
  return (
    <SignInLayout>
      <Outlet />
    </SignInLayout>
  );
}

/**
 * The not-found page inside the public layout, so an unknown address is never a dead end
 * (FR-SITE-001 AC3, FR-SITE-004). It is its own route component because the catch-all route has
 * no children.
 */
export function NotFoundRoute() {
  return (
    <PublicLayout>
      <NotFoundPage />
    </PublicLayout>
  );
}
