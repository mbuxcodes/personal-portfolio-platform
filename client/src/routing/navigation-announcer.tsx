import { useRef, type CSSProperties } from 'react';
import { useOnNavigation } from './use-on-navigation';

// Hidden from view, still read by screen readers. Tailwind's `sr-only` replaces this in M3.2.
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * A live region that announces each page change to screen readers.
 * It says nothing on first load, because the browser announces a loaded page itself.
 */
export function NavigationAnnouncer() {
  const regionRef = useRef<HTMLDivElement>(null);

  useOnNavigation(() => {
    if (regionRef.current) {
      regionRef.current.textContent = `Navigated to ${document.title}`;
    }
  });

  return <div ref={regionRef} role="status" aria-atomic="true" style={visuallyHidden} />;
}
