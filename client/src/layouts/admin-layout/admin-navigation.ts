import type { NavigationItem } from '../public-layout/public-navigation';

/** The management areas of the admin dashboard, in the order shown. */
export const ADMIN_NAVIGATION: readonly NavigationItem[] = [
  { label: 'Dashboard', to: '/admin', end: true },
  { label: 'Projects', to: '/admin/projects' },
  { label: 'Skills', to: '/admin/skills' },
  { label: 'Experience', to: '/admin/experience' },
  { label: 'Education', to: '/admin/education' },
  { label: 'Certifications', to: '/admin/certifications' },
  { label: 'Articles', to: '/admin/articles' },
  { label: 'Messages', to: '/admin/messages' },
  { label: 'Settings', to: '/admin/settings' },
];
