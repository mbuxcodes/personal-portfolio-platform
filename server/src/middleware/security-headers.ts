import type { RequestHandler } from 'express';
import helmet from 'helmet';
import type { EnvironmentName } from '#config/configuration';

/**
 * Where the media service delivers images. The images of this site are served from
 * `${MEDIA_DELIVERY_ORIGIN}/<cloud name>/`, and the policy allows that one path and nothing else
 * from the service. The cloud name is the only media setting the policy needs, so it adds no
 * configuration of its own.
 */
export const MEDIA_DELIVERY_ORIGIN = 'https://res.cloudinary.com';

/** One year, the value recommended for encrypted-connection pinning (TD-029). */
const HSTS_MAX_AGE_SECONDS = 31_536_000;

const SELF = "'self'";
const NONE = "'none'";

export interface SecurityHeadersOptions {
  environment: EnvironmentName;
  /** `CLOUDINARY_CLOUD_NAME`. Decides which images the policy allows. */
  mediaCloudName: string;
}

export type ContentSecurityDirectives = Record<string, string[]>;

/**
 * The content security policy (TD-029, ARCHITECTURE_DESIGN.md SA-8).
 *
 * Production, and every environment except development, gets the strict policy: scripts, styles,
 * fonts, and connections from this site only, no inline scripts or styles, images from this site
 * and from this site's folder at the media service only, and no framing.
 *
 * RECORDED EXCEPTIONS (TD-029: "Any relaxation is recorded as an exception with a reason").
 * Both apply in development only and are covered by tests that prove production does not have them.
 *
 *   E-1  `style-src 'unsafe-inline'`
 *        Reason: the Vite development server adds styles to the page as inline `<style>` elements so
 *        it can update them without a reload. Production builds ship one stylesheet file.
 *   E-2  `connect-src ws://localhost:* ws://127.0.0.1:*`
 *        Reason: the Vite development server pushes updates over a WebSocket on its own port.
 *        Production has no such connection.
 *
 * There is NO exception for scripts, in any environment. These headers only reach a browser page
 * when this server serves the page. In development the page comes from the Vite server, which sends
 * its own headers, so these exceptions are only a safety net for the day this server serves pages
 * in development (M13). Revisit them then, and remove any that are not needed.
 */
export function buildContentSecurityPolicy({
  environment,
  mediaCloudName,
}: SecurityHeadersOptions): ContentSecurityDirectives {
  const isDevelopment = environment === 'development';
  const mediaImages = `${MEDIA_DELIVERY_ORIGIN}/${encodeURIComponent(mediaCloudName)}/`;

  const directives: ContentSecurityDirectives = {
    'default-src': [SELF],
    'script-src': [SELF],
    'script-src-attr': [NONE],
    'style-src': isDevelopment ? [SELF, "'unsafe-inline'"] : [SELF],
    'img-src': [SELF, mediaImages],
    'font-src': [SELF],
    'connect-src': isDevelopment ? [SELF, 'ws://localhost:*', 'ws://127.0.0.1:*'] : [SELF],
    'object-src': [NONE],
    'base-uri': [SELF],
    'form-action': [SELF],
    'frame-ancestors': [NONE],
  };

  // Browsers on a development machine use plain http, so upgrading requests would break them.
  if (!isDevelopment) directives['upgrade-insecure-requests'] = [];

  return directives;
}

/**
 * Step 2 of the request pipeline (ARCHITECTURE_DESIGN.md Section 7.3): the security headers.
 *
 * Uses the maintained header library with a custom policy (TD-029). Alongside the content security
 * policy it sends: strict transport (not in development, where pinning `localhost` to encrypted
 * connections would break other local projects), no content-type guessing, no framing, no
 * cross-origin sharing of this site's responses or windows, and no referrer.
 *
 * Cross-origin embedder policy stays off. Turning it on would block images from the media service
 * unless that service marked them as embeddable, and this site shares nothing across origins anyway.
 *
 * Cross-origin resource sharing (CORS) is deliberately absent: no `Access-Control-*` header is ever
 * sent (TD-029, ADR-03).
 */
export function createSecurityHeaders(options: SecurityHeadersOptions): RequestHandler {
  return helmet({
    contentSecurityPolicy: { useDefaults: false, directives: buildContentSecurityPolicy(options) },
    strictTransportSecurity:
      options.environment === 'development'
        ? false
        : { maxAge: HSTS_MAX_AGE_SECONDS, includeSubDomains: true },
    frameguard: { action: 'deny' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
  });
}
