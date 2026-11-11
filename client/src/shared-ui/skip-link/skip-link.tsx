import type { MouseEvent } from 'react';

/** The `id` of the main region. Every layout puts it on its `main` element. */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * The first focusable element of every layout (FR-A11Y-003). It is hidden until it receives
 * focus, then it jumps over the navigation to the main region.
 *
 * Focus is moved by script, not by a `#` address, so the skip does not add an entry to the
 * browser history or change the address.
 */
export function SkipLink() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById(MAIN_CONTENT_ID);

    if (main) {
      event.preventDefault();
      main.focus();
    }
  }

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={handleClick}
      className="sr-only rounded-md bg-accent px-4 py-2 font-semibold text-text-on-accent no-underline focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
    >
      Skip to main content
    </a>
  );
}
