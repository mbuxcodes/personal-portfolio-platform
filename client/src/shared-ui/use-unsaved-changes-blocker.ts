import { useBeforeUnload, useBlocker } from 'react-router';

export interface UnsavedChangesBlocker {
  /** True while a navigation is paused and waiting for the user's decision. */
  isBlocked: boolean;
  /** Lets the paused navigation continue. The unsaved changes are discarded. */
  proceed: () => void;
  /** Cancels the paused navigation and keeps the user on the form. */
  stay: () => void;
}

/**
 * Protects a form with unsaved changes (FR-ADMIN-GEN-002).
 *
 * While `hasUnsavedChanges` is true:
 * - A navigation to a different page is paused. The caller shows the warning
 *   (a confirmation dialog, built in M3.5) when `isBlocked` is true, and answers
 *   with `proceed` (leave) or `stay`.
 * - Reloading or closing the tab asks the browser to show its own warning.
 *
 * A change to the search or hash of the same page is never blocked.
 *
 * It requires a data router (`createBrowserRouter` or `createMemoryRouter`).
 */
export function useUnsavedChangesBlocker(hasUnsavedChanges: boolean): UnsavedChangesBlocker {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  useBeforeUnload((event) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
    }
  });

  return {
    isBlocked: blocker.state === 'blocked',
    proceed: () => blocker.proceed?.(),
    stay: () => blocker.reset?.(),
  };
}
