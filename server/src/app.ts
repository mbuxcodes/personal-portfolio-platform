import express, { type Express } from 'express';
import { installPipeline, type PipelineConfig, type RouteProtections } from '#middleware/pipeline';
import type { Logger } from '#utils/logger';
import {
  ADMIN_GROUP_PATH,
  API_BASE_PATH,
  AUTH_GROUP_PATH,
  createRouteGroups,
  type RouteGroups,
} from './route-groups.js';

export interface AppOptions {
  /** Where request entries are written. Each request gets a child logger that carries its identifier. */
  logger: Logger;
  /**
   * How many proxy steps in front of the server are trusted to report the client address (TD-027).
   * It must equal the number of proxies of the hosting platform between the visitor and this
   * server. Too low, and every visitor shares the proxy's address, so one visitor can exhaust a
   * rate limit for everyone, and secure-transport detection fails. Too high, and a visitor can
   * choose their own address by sending the forwarded header. It is never `true` ("trust all").
   */
  trustProxyHops: number;
  /** What the shared pipeline reads from configuration: limits, site address, environment. */
  pipeline: PipelineConfig;
  /**
   * Where modules attach their routes to the groups. Tests use it for test-only routes.
   * It also receives the protections that routes attach themselves: the stricter rate limits and the
   * cross-site check.
   */
  registerRoutes?: (groups: RouteGroups, protections: RouteProtections) => void;
}

/**
 * Builds the configured Express application. It never listens and has no effect at import time,
 * so tests mount it directly and the process entry decides when to listen.
 *
 * The shared request pipeline of ARCHITECTURE_DESIGN.md Section 7.3 is installed here, in order, by
 * `installPipeline`. The session check (step 5) and the cross-site check (step 6) are not installed
 * for every request: the groups that need them attach them (Phase 5).
 */
export function createApp({
  logger,
  trustProxyHops,
  pipeline,
  registerRoutes,
}: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);

  // Steps 1 to 4 of the pipeline (Section 7.3), plus compression and cookie parsing.
  const protections = installPipeline(app, {
    logger,
    config: pipeline,
    groupPaths: { auth: AUTH_GROUP_PATH, admin: ADMIN_GROUP_PATH },
  });

  const groups = createRouteGroups();
  registerRoutes?.(groups, protections);

  // Most specific first, so the public group at the base path never shadows the others.
  app.use(AUTH_GROUP_PATH, groups.authRoutes);
  app.use(ADMIN_GROUP_PATH, groups.adminRoutes);
  app.use(API_BASE_PATH, groups.publicRoutes);

  return app;
}
