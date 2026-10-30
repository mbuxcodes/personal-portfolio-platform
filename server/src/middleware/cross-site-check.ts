import type { RequestHandler } from 'express';
import { getRequestContext } from '#utils/request-context';
import { sendRejection } from '#utils/rejection';

export const CROSS_SITE_REFUSED_EVENT = 'cross_site_request_refused';

export interface CrossSiteCheckOptions {
  /** The public address of the site (`SITE_URL`). Only requests that come from its origin pass. */
  siteUrl: string;
}

/** The methods that change data. Reads are not checked. */
const DATA_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type RefusalReason = 'origin_missing' | 'origin_mismatch' | 'fetch_site_mismatch';

/**
 * Step 6 of the request pipeline (ARCHITECTURE_DESIGN.md Section 7.3) and TD-030: the cross-site
 * check. This is a reusable piece. M2.4 builds it and tests it. The auth and admin groups attach it,
 * after the session check, in Phase 5 (`RouteProtections.crossSiteCheck`).
 *
 * A request that changes data is refused with `403 FORBIDDEN` unless:
 *
 * - its `Origin` header is present and is exactly the origin of the site. A request without an
 *   origin is refused, and so is the origin `null` that browsers send from sandboxed pages. There
 *   are no non-browser clients (TD-030).
 * - its `Sec-Fetch-Site` header, where the browser sends one, says `same-origin`. `same-site`
 *   (another subdomain) and `none` are refused, because the page that sends this site's requests
 *   always comes from this origin. An absent header does not refuse, since the rule applies "where
 *   the browser supplies it".
 *
 * No token or special header is required from clients. This is one of the three layers of TD-030,
 * together with same-site cookies and the content-type rule of step 4. The refusal is logged as a
 * security event with its reason. The values the client sent are never logged.
 */
export function createCrossSiteCheck({ siteUrl }: CrossSiteCheckOptions): RequestHandler {
  const siteOrigin = new URL(siteUrl).origin;

  return (request, response, next) => {
    if (!DATA_CHANGING_METHODS.has(request.method)) {
      next();
      return;
    }

    const refusal = reasonToRefuse(request.headers.origin, request.headers['sec-fetch-site']);
    if (refusal === null) {
      next();
      return;
    }

    getRequestContext(response)?.logger.warn(CROSS_SITE_REFUSED_EVENT, {
      category: 'security',
      reason: refusal,
    });
    sendRejection(response, {
      status: 403,
      code: 'FORBIDDEN',
      message: 'This request could not be completed.',
    });
  };

  function reasonToRefuse(
    origin: string | undefined,
    fetchSite: string | undefined,
  ): RefusalReason | null {
    if (origin === undefined) return 'origin_missing';
    if (origin !== siteOrigin) return 'origin_mismatch';
    if (fetchSite !== undefined && fetchSite !== 'same-origin') return 'fetch_site_mismatch';
    return null;
  }
}
