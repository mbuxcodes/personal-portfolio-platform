import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Runs `onNavigate` after the page changes to a different path, once the new page has rendered.
 * It does not run for the first page load, or for a change of search or hash only.
 */
export function useOnNavigation(onNavigate: () => void): void {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    onNavigate();
  }, [pathname, onNavigate]);
}
