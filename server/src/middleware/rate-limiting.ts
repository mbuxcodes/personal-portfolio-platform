import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import type { RateLimitConfig, RateLimitsConfig } from '#config/configuration';
import { createClientIndicator, type ClientIndicator } from '#utils/client-indicator';
import type { Logger } from '#utils/logger';
import { getRequestContext } from '#utils/request-context';
import { sendRejection } from '#utils/rejection';

/** The event written when a limit is reached (ARCHITECTURE_DESIGN.md Section 12.4). */
export const RATE_LIMIT_EVENT = 'rate_limit_triggered';

export interface RateLimiterOptions {
  /** The route group or endpoint class the limit protects. It is written to the log entry. */
  group: string;
  /** The maximum and the window, from configuration (TD-027). */
  limit: RateLimitConfig;
  logger: Logger;
  indicate: ClientIndicator;
}

/**
 * One in-memory rate limiter (TD-027, ADR-16). Each limiter has its own counters, so limits never
 * add up across groups. Counters are per client address, which is `request.ip`: it is the visitor's
 * address only when `TRUST_PROXY_HOPS` matches the hosting platform (see `app.ts`).
 *
 * When the limit is reached the response is `429 TOO_MANY_REQUESTS` with a `Retry-After` header
 * (API_DESIGN.md Section 15.1). The message never says anything about accounts. One warning entry
 * is written with the group and a client indicator, never the address.
 *
 * Counters live in this process, so they reset on restart and are not shared between instances.
 */
export function createRateLimiter({
  group,
  limit,
  logger,
  indicate,
}: RateLimiterOptions): RequestHandler {
  return rateLimit({
    windowMs: limit.windowSeconds * 1000,
    limit: limit.max,
    // The contract names only `Retry-After` (API_DESIGN.md Section 8.8), and it is set below.
    standardHeaders: false,
    legacyHeaders: false,
    handler: (request, response) => {
      const retryAfterSeconds = retryAfterOf(request, limit.windowSeconds);

      (getRequestContext(response)?.logger ?? logger).warn(RATE_LIMIT_EVENT, {
        category: 'security',
        group,
        clientIndicator: indicate(request.ip),
        limit: limit.max,
        windowSeconds: limit.windowSeconds,
        retryAfterSeconds,
      });

      sendRejection(response, {
        status: 429,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please wait a moment and try again.',
        headers: { 'Retry-After': String(retryAfterSeconds) },
      });
    },
  });
}

/** Whole seconds until the client's window ends. Never less than 1, never more than the window. */
function retryAfterOf(request: unknown, windowSeconds: number): number {
  const resetTime = (request as { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
  const seconds =
    resetTime === undefined ? windowSeconds : Math.ceil((resetTime.getTime() - Date.now()) / 1000);
  return Math.min(Math.max(seconds, 1), windowSeconds);
}

/**
 * Every limiter of TD-027, built from configuration.
 *
 * The first three are the route-group limits that step 3 applies to every request. The last four
 * are the stricter limits for single endpoints. Routes attach them when they are built: sign-in
 * and renewal in Phase 5, contact in Phase 10, upload in Phase 9. They are handed to routes through
 * `RouteProtections`, so no route builds its own limiter or its own number.
 */
export interface RateLimiters {
  /** Everything outside the admin and auth groups: public reads and the pages themselves. */
  publicRead: RequestHandler;
  /** The admin group. */
  admin: RequestHandler;
  /** The auth group. It is session-carried like the admin group, so it has the admin limit. */
  auth: RequestHandler;
  contact: RequestHandler;
  signIn: RequestHandler;
  renewal: RequestHandler;
  upload: RequestHandler;
}

export function createRateLimiters(rateLimits: RateLimitsConfig, logger: Logger): RateLimiters {
  const indicate = createClientIndicator();
  const make = (group: string, limit: RateLimitConfig): RequestHandler =>
    createRateLimiter({ group, limit, logger, indicate });

  return {
    publicRead: make('public', rateLimits.publicRead),
    admin: make('admin', rateLimits.admin),
    auth: make('auth', rateLimits.admin),
    contact: make('contact', rateLimits.contact),
    signIn: make('sign_in', rateLimits.signIn),
    renewal: make('renewal', rateLimits.renewal),
    upload: make('upload', rateLimits.upload),
  };
}

export interface LimitedGroup {
  /** The address the group is mounted at, such as `/api/v1/admin`. */
  pathPrefix: string;
  limiter: RequestHandler;
}

/**
 * Step 3 of the request pipeline (ARCHITECTURE_DESIGN.md Section 7.3): the route-group limit.
 *
 * Each request is counted against exactly one limiter: the one of the group whose address it is
 * under, or the fallback when it is under none. The match ignores case, because routing ignores
 * case, so a request cannot reach a group while being counted against another one.
 */
export function createGroupRateLimiting(
  groups: readonly LimitedGroup[],
  fallback: RequestHandler,
): RequestHandler {
  const prefixed = groups.map(({ pathPrefix, limiter }) => ({
    pathPrefix: pathPrefix.toLowerCase(),
    limiter,
  }));

  return (request, response, next) => {
    const path = request.path.toLowerCase();
    const group = prefixed.find(
      ({ pathPrefix }) => path === pathPrefix || path.startsWith(`${pathPrefix}/`),
    );
    (group?.limiter ?? fallback)(request, response, next);
  };
}
