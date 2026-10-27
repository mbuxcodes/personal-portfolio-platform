import { Router } from 'express';

/** The base path of every API route. Nothing else in the server spells it out. */
export const API_BASE_PATH = '/api/v1';
export const AUTH_GROUP_PATH = `${API_BASE_PATH}/auth`;
export const ADMIN_GROUP_PATH = `${API_BASE_PATH}/admin`;

/**
 * The three route groups of ARCHITECTURE_DESIGN.md Sections 7.3 and 10. Each group is an empty router.
 * Modules attach their routes to a group, and the group's protections (such as the admin
 * session check) are attached to the group, never to single routes.
 */
export interface RouteGroups {
  /** Sign-in, sign-out, and session endpoints: `/api/v1/auth`. */
  authRoutes: Router;
  /** Everything for the signed-in admin: `/api/v1/admin`. */
  adminRoutes: Router;
  /** Public reads and message submission: `/api/v1`. */
  publicRoutes: Router;
}

export function createRouteGroups(): RouteGroups {
  return { authRoutes: Router(), adminRoutes: Router(), publicRoutes: Router() };
}
