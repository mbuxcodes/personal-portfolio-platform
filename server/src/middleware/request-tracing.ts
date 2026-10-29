import type { Request, RequestHandler } from 'express';
import type { Logger } from '#utils/logger';
import { createRequestId, setRequestContext } from '#utils/request-context';

export interface RequestTracingOptions {
  logger: Logger;
  /** Milliseconds from a monotonic clock. Replaceable so tests control durations. */
  now?: () => number;
}

/**
 * Step 1 of the request pipeline (ARCHITECTURE_DESIGN.md Section 7.3): request identification.
 *
 * - Every request gets a new identifier. Nothing the client sends is used or trusted as one.
 * - The identifier and a logger that carries it are stored on the response (see
 *   `getRequestContext`), where later middleware and the error handler read them.
 * - Exactly one entry is written when the request ends, whether the response was sent or the
 *   connection closed early. It holds the identifier, method, route pattern, status, and duration.
 *
 * Nothing else about the request is read: not the headers, the query, the path, or the body.
 * Request bodies cannot reach a log from here because this code never touches them.
 */
export function createRequestTracing({
  logger,
  now = () => performance.now(),
}: RequestTracingOptions): RequestHandler {
  return (request, response, next) => {
    const requestId = createRequestId();
    const requestLogger = logger.child({ requestId });
    const startedAt = now();
    const routePattern = followRoutePattern(request);

    setRequestContext(response, { requestId, logger: requestLogger });

    response.once('close', () => {
      requestLogger.info('request_completed', {
        method: request.method,
        route: routePattern(),
        status: response.statusCode,
        durationMs: Math.round(now() - startedAt),
        aborted: !response.writableFinished,
      });
    });

    next();
  };
}

/**
 * Follows which route handles the request, and returns a function that reads its pattern, such as
 * `/api/v1/projects/:id`. The pattern is never the real path, so identifiers and personal data in
 * addresses stay out of logs. It is null when no route handled the request.
 *
 * The pattern is read at the moment Express picks the route, because Express resets the mount path
 * (`baseUrl`) when a request leaves a router with an error, and the pattern would lose its prefix.
 */
function followRoutePattern(request: Request): () => string | null {
  let route: unknown;
  let pattern: string | null = null;

  Object.defineProperty(request, 'route', {
    configurable: true,
    enumerable: true,
    get: () => route,
    set: (picked: unknown) => {
      route = picked;
      const path = (picked as { path?: unknown } | undefined)?.path;
      const mountPath = (request.baseUrl as string | undefined) ?? '';
      pattern = typeof path === 'string' ? `${mountPath}${path}` : null;
    },
  });

  return () => pattern;
}
