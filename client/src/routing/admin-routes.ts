import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { AdminGuard } from './admin-guard';

type AdminPages = typeof import('./admin-pages');

/** The only address prefix of the admin area. Web Delivery serves the admin shell for it. */
export const ADMIN_BASE_PATH = '/admin';

/** Loads one admin page. Every page comes from the same module, so they share one chunk. */
function adminPage(pick: (pages: AdminPages) => ComponentType) {
  return async () => ({ Component: pick(await import('./admin-pages')) });
}

/**
 * The admin routes. Sign-in is open. Every other page sits behind the guard.
 * Unknown addresses under `/admin` fall through to the not-found route.
 */
export const adminRoutes: RouteObject[] = [
  {
    path: ADMIN_BASE_PATH,
    children: [
      { path: 'sign-in', lazy: adminPage((pages) => pages.SignInPage) },
      {
        Component: AdminGuard,
        children: [
          { index: true, lazy: adminPage((pages) => pages.DashboardPage) },
          { path: 'projects', lazy: adminPage((pages) => pages.ProjectsManagementPage) },
          { path: 'skills', lazy: adminPage((pages) => pages.SkillsManagementPage) },
          { path: 'experience', lazy: adminPage((pages) => pages.ExperienceManagementPage) },
          { path: 'education', lazy: adminPage((pages) => pages.EducationManagementPage) },
          {
            path: 'certifications',
            lazy: adminPage((pages) => pages.CertificationsManagementPage),
          },
          { path: 'articles', lazy: adminPage((pages) => pages.ArticlesManagementPage) },
          { path: 'messages', lazy: adminPage((pages) => pages.MessagesPage) },
          { path: 'settings', lazy: adminPage((pages) => pages.SettingsPage) },
          { path: 'account', lazy: adminPage((pages) => pages.AccountPage) },
        ],
      },
    ],
  },
];
