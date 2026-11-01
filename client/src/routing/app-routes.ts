import type { RouteObject } from 'react-router';
import { NotFoundPage } from '@/features/public/not-found';
import { adminRoutes } from './admin-routes';
import { devRoutes } from './dev-routes';
import { publicRoutes } from './public-routes';
import { RootRoute, RouteLoading } from './root-route';

/**
 * Every route of the application, under one root route that handles focus and announcements.
 * Development-only pages are added in development builds. The last route matches every other
 * address and shows the not-found page.
 */
export const appRoutes: RouteObject[] = [
  {
    Component: RootRoute,
    HydrateFallback: RouteLoading,
    children: [
      ...publicRoutes,
      ...adminRoutes,
      ...devRoutes,
      { path: '*', Component: NotFoundPage },
    ],
  },
];
