import { AdminLayoutRoute } from './layout-routes';
import { useAdminGuard } from './use-admin-guard';

/**
 * Wraps the admin pages that need a session, and gives them the admin layout. The layout is
 * inside the guard, so a visitor who is not allowed in never sees the admin navigation or the
 * Sign out control. The sign-in page is outside it.
 */
export function AdminGuard() {
  const { isAllowed } = useAdminGuard();

  return isAllowed ? <AdminLayoutRoute /> : null;
}
