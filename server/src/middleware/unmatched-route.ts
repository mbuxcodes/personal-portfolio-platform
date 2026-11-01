import type { RequestHandler } from 'express';
import { MethodNotAllowedError, NotFoundError } from '#utils/application-error';

/** A router and the address it is mounted at, such as `/api/v1/admin`. */
export interface MountedRouter {
  pathPrefix: string;
  router: unknown;
}

/**
 * The parts of Express 5's router (the `router` package) that this file reads. They are not part
 * of Express's documented API, so this is the only place that depends on them, and the tests in
 * `unmatched-route.test.ts` pin the behavior. If an Express upgrade changes them, the tests fail
 * and nothing else is affected. A router that does not look like this simply yields no methods,
 * and the answer is a plain 404.
 */
interface LayerLike {
  route?: { methods?: Record<string, unknown> };
  handle?: { stack?: readonly LayerLike[] };
  path?: string;
  match?: (path: string) => boolean;
}

function collectMethods(stack: readonly LayerLike[], path: string, found: Set<string>): void {
  for (const layer of stack) {
    if (typeof layer.match !== 'function' || !layer.match(path)) continue;

    if (layer.route !== undefined) {
      for (const [method, handled] of Object.entries(layer.route.methods ?? {})) {
        if (handled === true && !method.startsWith('_')) found.add(method.toUpperCase());
      }
      continue;
    }

    const children = layer.handle?.stack;
    if (children !== undefined) {
      const rest = path.slice((layer.path ?? '').length);
      collectMethods(children, rest.startsWith('/') ? rest : `/${rest}`, found);
    }
  }
}

/** The methods that some route accepts at this address, in alphabetical order. */
function methodsAt(mounts: readonly MountedRouter[], path: string): string[] {
  const found = new Set<string>();
  const lowerPath = path.toLowerCase();

  for (const { pathPrefix, router } of mounts) {
    const prefix = pathPrefix.toLowerCase();
    if (lowerPath !== prefix && !lowerPath.startsWith(`${prefix}/`)) continue;
    const stack = (router as { stack?: readonly LayerLike[] }).stack;
    if (stack !== undefined) collectMethods(stack, path.slice(prefix.length) || '/', found);
  }

  // A route for GET also answers HEAD.
  if (found.has('GET')) found.add('HEAD');
  return [...found].sort();
}

/**
 * The end of the route chain: nothing handled the request. It answers `405 METHOD_NOT_ALLOWED`,
 * with an `Allow` header, when the address exists for other methods, and `404 NOT_FOUND`
 * otherwise (API_DESIGN.md Section 13.2). It raises the error and does not send it, so the central
 * error handler stays the only place that builds an error response.
 *
 * Install it after every route and before the central error handler.
 */
export function createUnmatchedRouteHandler(mounts: readonly MountedRouter[]): RequestHandler {
  return (request, _response, next) => {
    const allowed = methodsAt(mounts, request.path);
    // A route that accepts this method but passed the request on is not a wrong-method case.
    next(
      allowed.length === 0 || allowed.includes(request.method)
        ? new NotFoundError()
        : new MethodNotAllowedError(allowed),
    );
  };
}
