import { Outlet } from 'react-router';
import { useAdminGuard } from './use-admin-guard';

/** Wraps the admin pages that need a session. The sign-in page is outside it. */
export function AdminGuard() {
  const { isAllowed } = useAdminGuard();

  return isAllowed ? <Outlet /> : null;
}
