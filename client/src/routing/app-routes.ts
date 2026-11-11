import type { RouteObject } from 'react-router';
import { ErrorPageLayout } from '@/layouts';
import { adminRoutes } from './admin-routes';
import { devRoutes } from './dev-routes';
import { NotFoundRoute, PublicLayoutRoute } from './layout-routes';
import { publicRoutes } from './public-routes';
import { RootRoute, RouteLoading } from './root-route';

/**
 * Every route of the application, under one root route that handles focus and announcements.
 * The public pages share the public layout. The admin routes bring their own layouts.
 * Development-only pages are added in development builds and have no layout. The last route
 * matches every other address and shows the not-found page inside the public layout.
 */
export const appRoutes: RouteObject[] = [
  {
    Component: RootRoute,
    HydrateFallback: RouteLoading,
    ErrorBoundary: ErrorPageLayout,
    children: [
      { Component: PublicLayoutRoute, children: publicRoutes },
      ...adminRoutes,
      ...devRoutes,
      { path: '*', Component: NotFoundRoute },
    ],
  },
];
