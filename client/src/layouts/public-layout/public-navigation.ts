export interface NavigationItem {
  label: string;
  to: string;
  /** True when only the exact address is current. Needed for Home, whose address starts all others. */
  end?: boolean;
}

/**
 * The nine public areas, in the order shown (FR-SITE-001). The addresses must match the public
 * route table in `routing/public-route-table.ts`, which a routing test checks. A detail page,
 * such as `/projects/some-project`, keeps its area marked as current.
 */
export const PUBLIC_NAVIGATION: readonly NavigationItem[] = [
  { label: 'Home', to: '/', end: true },
  { label: 'About', to: '/about' },
  { label: 'Skills', to: '/skills' },
  { label: 'Experience', to: '/experience' },
  { label: 'Education', to: '/education' },
  { label: 'Projects', to: '/projects' },
  { label: 'Certifications', to: '/certifications' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' },
];
