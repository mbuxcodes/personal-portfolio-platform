import type { RequestHandler } from 'express';
import type { EnvironmentName } from '#config/configuration';
import { sendRejection } from '#utils/rejection';

export interface SecureTransportOptions {
  environment: EnvironmentName;
  /** The public address of the site (`SITE_URL`). Redirects go to its host, never to the request's. */
  siteUrl: string;
}

/**
 * Step 2 of the request pipeline (ARCHITECTURE_DESIGN.md Section 7.3): encrypted connections only.
 *
 * In production, a request that did not arrive over an encrypted connection is not served.
 * Reads are redirected to the same address on the site's host over https (308). Everything else is
 * refused with 403, because a request that changes data would already have crossed the network in
 * the clear.
 *
 * Whether a request was encrypted comes from `request.secure`, which follows the forwarded protocol
 * header of the hosting platform for exactly the number of trusted proxy steps
 * (`TRUST_PROXY_HOPS`, TD-027). If that number is wrong, nothing in production is served over
 * plain http, which shows at once during the launch check (R-23). The platform must therefore
 * forward the original protocol, and any availability probe must send it too.
 *
 * Other environments are never redirected: development and tests run over plain http.
 */
export function createSecureTransport({
  environment,
  siteUrl,
}: SecureTransportOptions): RequestHandler {
  if (environment !== 'production') return (_request, _response, next) => void next();

  // The redirect target comes from configuration. A `Host` header from the client is never trusted.
  const { host } = new URL(siteUrl);

  return (request, response, next) => {
    if (request.secure) {
      next();
      return;
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      response.redirect(308, `https://${host}${request.originalUrl}`);
      return;
    }

    sendRejection(response, {
      status: 403,
      code: 'FORBIDDEN',
      message: 'This request must be made over an encrypted connection.',
    });
  };
}
