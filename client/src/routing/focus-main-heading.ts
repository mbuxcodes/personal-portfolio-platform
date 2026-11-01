/**
 * Moves keyboard and screen reader focus to the page's main heading.
 *
 * Every page has exactly one `h1` (FR-A11Y-004). A heading is not focusable by default,
 * so it receives `tabindex="-1"`: focusable by script, and not added to the Tab order.
 */
export function focusMainHeading(): void {
  const heading = document.querySelector<HTMLElement>('h1');

  if (!heading) {
    return;
  }

  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
  }

  heading.focus();
}
