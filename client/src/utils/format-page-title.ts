/** The owner's name, shown at the end of every page title. */
export const SITE_NAME = 'Muhammad Bux Brohi';

/** The title of the Home page. It matches the title in `index.html`. */
const DEFAULT_PAGE_TITLE = `${SITE_NAME} | Full Stack Developer`;

const TITLE_SEPARATOR = ' | ';

/**
 * Builds a document title from the most specific part first, followed by the site name.
 *
 * `formatPageTitle('About')` returns "About | Muhammad Bux Brohi".
 * `formatPageTitle('Dashboard', 'Admin')` returns "Dashboard | Admin | Muhammad Bux Brohi".
 * `formatPageTitle()` returns the Home page title.
 */
export function formatPageTitle(...segments: string[]): string {
  if (segments.length === 0) {
    return DEFAULT_PAGE_TITLE;
  }

  return [...segments, SITE_NAME].join(TITLE_SEPARATOR);
}
