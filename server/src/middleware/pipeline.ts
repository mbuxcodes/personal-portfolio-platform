import cookieParser from 'cookie-parser';
import type { Express, RequestHandler } from 'express';
import type { Config, EnvironmentName, RateLimitsConfig } from '#config/configuration';
import type { Logger } from '#utils/logger';
import {
  createBodyLimits,
  JSON_BODY_LIMIT_BYTES,
  MULTIPART_OVERHEAD_BYTES,
  type BodyLimits,
} from './body-limits.js';
import { createCrossSiteCheck } from './cross-site-check.js';
import { createGroupRateLimiting, createRateLimiters, type RateLimiters } from './rate-limiting.js';
import { createRequestTracing } from './request-tracing.js';
import { createResponseCompression } from './response-compression.js';
import { createSecureTransport } from './secure-transport.js';
import { createSecurityHeaders } from './security-headers.js';

/** Everything the shared pipeline reads from configuration. Nothing in it is a secret. */
export interface PipelineConfig {
  environment: EnvironmentName;
  /** `SITE_URL`: the origin that the cross-site check and the secure-transport redirect use. */
  siteUrl: string;
  /** `CLOUDINARY_CLOUD_NAME`: decides which images the content security policy allows. */
  mediaCloudName: string;
  /** One maximum and window per route group and endpoint class (TD-027). */
  rateLimits: RateLimitsConfig;
  bodyLimits: BodyLimits;
}

/** Reads the pipeline's settings from the validated configuration. */
export function pipelineConfigOf(config: Config): PipelineConfig {
  return {
    environment: config.runtime.environment,
    siteUrl: config.site.url,
    mediaCloudName: config.media.cloudName,
    rateLimits: config.rateLimits,
    bodyLimits: {
      jsonBytes: JSON_BODY_LIMIT_BYTES,
      multipartBytes: config.limits.uploadMaxBytes + MULTIPART_OVERHEAD_BYTES,
    },
  };
}

/**
 * The protections that routes attach themselves, because they depend on the route and not on the
 * route group. They are handed to `registerRoutes`, so a module never builds its own.
 */
export interface RouteProtections {
  /** The stricter limits of TD-027. Each route attaches the one for its endpoint. */
  rateLimiters: Pick<RateLimiters, 'contact' | 'signIn' | 'renewal' | 'upload'>;
  /** Step 6: attached after the session check on routes that change data (TD-030). */
  crossSiteCheck: RequestHandler;
}

export interface PipelineOptions {
  logger: Logger;
  config: PipelineConfig;
  /** The addresses of the groups that have their own limit. Everything else is counted as public. */
  groupPaths: { auth: string; admin: string };
}

/**
 * Installs the shared request pipeline on the application, in the fixed order of
 * ARCHITECTURE_DESIGN.md Section 7.3. This function is the one place where the order is written,
 * and the order is tested (see `pipeline.test.ts`).
 *
 * | Step | Stage                           | Installed here                                      |
 * | ---- | ------------------------------- | --------------------------------------------------- |
 * | 1    | Request identification          | request tracing (M2.3)                              |
 * | 2    | Secure transport and headers    | security headers, then encrypted-connection check  |
 * | 3    | Rate limiting                   | the limit of the route group the request is under   |
 * | 4    | Body limits and content type    | content type, size, JSON body                       |
 * | 5    | Session check                   | NOT HERE. The admin and auth groups attach it (M5)  |
 * | 6    | Cross-site check                | NOT HERE. Built here; attached in M5 (`RouteProtections`) |
 * | 7    | Route match and input validation| route match in `app.ts`; validation per route (M2.5)|
 * | 8-11 | Controller to request log entry | modules, M2.5, and request tracing's completion log |
 *
 * Two pieces that are not steps of Section 7.3 support them, and sit where they are needed:
 * response compression directly after step 2, so that every later response is compressed, and cookie
 * parsing directly after step 4, because the session check of step 5 reads cookies.
 *
 * There is no cross-origin resource sharing layer, on purpose (TD-029). One origin serves everything.
 *
 * @returns the protections that routes attach themselves.
 */
export function installPipeline(app: Express, options: PipelineOptions): RouteProtections {
  const { logger, config, groupPaths } = options;
  const limiters = createRateLimiters(config.rateLimits, logger);

  // Step 1
  app.use(createRequestTracing({ logger }));

  // Step 2
  app.use(
    createSecurityHeaders({
      environment: config.environment,
      mediaCloudName: config.mediaCloudName,
    }),
  );
  app.use(createSecureTransport({ environment: config.environment, siteUrl: config.siteUrl }));
  app.use(createResponseCompression());

  // Step 3
  app.use(
    createGroupRateLimiting(
      [
        { pathPrefix: groupPaths.auth, limiter: limiters.auth },
        { pathPrefix: groupPaths.admin, limiter: limiters.admin },
      ],
      limiters.publicRead,
    ),
  );

  // Step 4, then the cookie parsing that step 5 needs
  app.use(...createBodyLimits(config.bodyLimits));
  app.use(cookieParser());

  return {
    rateLimiters: {
      contact: limiters.contact,
      signIn: limiters.signIn,
      renewal: limiters.renewal,
      upload: limiters.upload,
    },
    crossSiteCheck: createCrossSiteCheck({ siteUrl: config.siteUrl }),
  };
}
