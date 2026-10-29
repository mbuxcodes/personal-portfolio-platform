import express, { type Express } from 'express';
import { createRequestTracing } from '#middleware/request-tracing';
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
  /** How many proxy steps in front of the server are trusted to report the client address. */
  trustProxyHops: number;
  /** Where modules attach their routes to the groups. Tests use it for test-only routes. */
  registerRoutes?: (groups: RouteGroups) => void;
}

/**
 * Builds the configured Express application. It never listens and has no effect at import time,
 * so tests mount it directly and the process entry decides when to listen.
 *
 * The request pipeline of ARCHITECTURE_DESIGN.md Section 7.3 is added here, in order: request
 * identification is in place, and later milestones add the other steps.
 */
export function createApp({ logger, trustProxyHops, registerRoutes }: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);

  // Step 1 of the pipeline (Section 7.3). Later milestones add the other steps after it, in order.
  app.use(createRequestTracing({ logger }));

  const groups = createRouteGroups();
  registerRoutes?.(groups);

  // Most specific first, so the public group at the base path never shadows the others.
  app.use(AUTH_GROUP_PATH, groups.authRoutes);
  app.use(ADMIN_GROUP_PATH, groups.adminRoutes);
  app.use(API_BASE_PATH, groups.publicRoutes);

  return app;
}
