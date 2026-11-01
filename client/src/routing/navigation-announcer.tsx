import { useRef } from 'react';
import { useOnNavigation } from './use-on-navigation';

/**
 * A live region that announces each page change to screen readers.
 * It says nothing on first load, because the browser announces a loaded page itself.
 * `sr-only` hides it from view and keeps it available to screen readers. It is a class, not an
 * inline style, because the content security policy blocks inline styles (TD-029).
 */
export function NavigationAnnouncer() {
  const regionRef = useRef<HTMLDivElement>(null);

  useOnNavigation(() => {
    if (regionRef.current) {
      regionRef.current.textContent = `Navigated to ${document.title}`;
    }
  });

  return <div ref={regionRef} role="status" aria-atomic="true" className="sr-only" />;
}
