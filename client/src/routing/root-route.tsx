import { Outlet } from 'react-router';
import { focusMainHeading } from './focus-main-heading';
import { NavigationAnnouncer } from './navigation-announcer';
import { useOnNavigation } from './use-on-navigation';

/** Wraps every page. Moves focus to the main heading and announces each page change. */
export function RootRoute() {
  useOnNavigation(focusMainHeading);

  return (
    <>
      <Outlet />
      <NavigationAnnouncer />
    </>
  );
}

/** Shown while the first page, or the admin area, is being loaded. */
export function RouteLoading() {
  return <p role="status">Loading…</p>;
}
