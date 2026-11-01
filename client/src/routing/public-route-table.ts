/**
 * The public route table: every address a visitor can open, in one place.
 *
 * This is a plain list on purpose. The client router is built from it
 * (see `public-routes.ts`), and Web Delivery (M6.2) must serve the page shell for
 * exactly these address patterns (TD-036, risk C-16). A comparison test between
 * the client and the server is part of M13.1. When a public page is added or
 * changed, this table, the router, and the server list change together.
 *
 * Rules
 * - Every public area is its own page with its own address (ARCHITECTURE_DESIGN.md A-7).
 * - Detail addresses use `publicAddressName`, which is fixed after first publication.
 * - Any other address shows the not-found page. The server returns the matching status.
 * - The admin area is not listed here. It is never linked from public pages (FR-AUTH-008).
 *
 * Patterns use the React Router syntax. `:publicAddressName` matches one path segment.
 */
export const PUBLIC_ROUTE_TABLE = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'skills', path: '/skills' },
  { name: 'experience', path: '/experience' },
  { name: 'education', path: '/education' },
  { name: 'certifications', path: '/certifications' },
  { name: 'projects', path: '/projects' },
  { name: 'projectDetail', path: '/projects/:publicAddressName' },
  { name: 'blog', path: '/blog' },
  { name: 'article', path: '/blog/:publicAddressName' },
  { name: 'contact', path: '/contact' },
] as const;

export type PublicRouteName = (typeof PUBLIC_ROUTE_TABLE)[number]['name'];
