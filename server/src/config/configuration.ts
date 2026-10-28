import { environmentSchema, type ParsedEnvironment } from '#config/environment-schema';

export type EnvironmentName = 'development' | 'test' | 'production';

export interface RuntimeConfig {
  readonly environment: EnvironmentName;
  readonly port: number;
  /** How many proxy steps in front of the server are trusted for the client address (TD-027). */
  readonly trustProxyHops: number;
  /** How long in-flight requests may take to finish during shutdown (TD-047). */
  readonly shutdownTimeoutMs: number;
}

export interface DatabaseConfig {
  /** Secret: the connection string carries credentials. */
  readonly url: string;
}

export interface MediaConfig {
  readonly cloudName: string;
  /** Secret. */
  readonly apiKey: string;
  /** Secret. */
  readonly apiSecret: string;
  readonly folder: string;
}

export interface SessionConfig {
  /** Secret. Differs from the renewal secret. */
  readonly accessTokenSecret: string;
  /** Secret. Differs from the access secret. */
  readonly refreshTokenSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly inactivityLimitSeconds: number;
  readonly maxLifetimeSeconds: number;
}

export interface PageSizesConfig {
  /** Default page size of `GET /projects`. */
  readonly projects: number;
  /** Default page size of `GET /articles`. */
  readonly articles: number;
  /** Default page size of the admin lists. */
  readonly admin: number;
  readonly publicMaximum: number;
  readonly adminMaximum: number;
}

export interface LimitsConfig {
  readonly pageSizes: PageSizesConfig;
  readonly uploadMaxBytes: number;
  readonly duplicateMessageWindowSeconds: number;
}

export interface RateLimitConfig {
  readonly max: number;
  readonly windowSeconds: number;
}

export interface RateLimitsConfig {
  readonly publicRead: RateLimitConfig;
  readonly contact: RateLimitConfig;
  readonly signIn: RateLimitConfig;
  readonly renewal: RateLimitConfig;
  readonly admin: RateLimitConfig;
  readonly upload: RateLimitConfig;
}

export interface SiteConfig {
  /** The public address of the site, as an absolute http or https URL. */
  readonly url: string;
}

/** The complete validated configuration (TD-046). Every level is frozen. */
export interface Config {
  readonly runtime: RuntimeConfig;
  readonly database: DatabaseConfig;
  readonly media: MediaConfig;
  readonly session: SessionConfig;
  readonly limits: LimitsConfig;
  readonly rateLimits: RateLimitsConfig;
  readonly site: SiteConfig;
}

type Environment = Readonly<Record<string, string | undefined>>;

/**
 * Thrown when configuration is invalid. It carries variable names only: never values, and never
 * the validator's own messages, so a secret cannot reach a log through it.
 */
export class InvalidConfigurationError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Invalid configuration: ${variables.join(', ')}`);
    this.name = 'InvalidConfigurationError';
    this.variables = variables;
  }
}

/**
 * Reads, validates, and freezes the configuration. This module is the only place in the server
 * that reads the environment (enforced by a lint rule and a test). The process entry calls this
 * once at startup and passes the result on; nothing else parses or reads settings again.
 *
 * Development loads `.env` through the runtime's own `--env-file-if-exists` flag (see the `dev`
 * script), so no code here reads a file. Production values come from the hosting platform.
 *
 * @throws InvalidConfigurationError naming every missing or invalid variable.
 */
export function loadConfig(env: Environment = process.env): Config {
  const parsed = environmentSchema.safeParse(withoutEmptyValues(env));
  if (!parsed.success) {
    throw new InvalidConfigurationError(namesOfProblems(parsed.error.issues));
  }

  const inconsistent = findInconsistentVariables(parsed.data);
  if (inconsistent.length > 0) throw new InvalidConfigurationError(inconsistent);

  return buildConfig(parsed.data);
}

/** An empty value counts as not set, as copied templates and hosting platforms leave blanks. */
function withoutEmptyValues(env: Environment): Environment {
  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
}

function namesOfProblems(issues: readonly { path: readonly PropertyKey[] }[]): string[] {
  const names = issues.map((issue) => issue.path[0]).filter((name) => typeof name === 'string');
  return [...new Set(names)];
}

/** Rules that compare two values. They run only when every single value is valid. */
function findInconsistentVariables(values: ParsedEnvironment): string[] {
  const names: string[] = [];

  if (values.ACCESS_TOKEN_SECRET === values.REFRESH_TOKEN_SECRET) {
    names.push('ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET');
  }
  if (values.ACCESS_TOKEN_TTL_SECONDS > values.SESSION_INACTIVITY_LIMIT_SECONDS) {
    names.push('ACCESS_TOKEN_TTL_SECONDS', 'SESSION_INACTIVITY_LIMIT_SECONDS');
  }
  if (values.SESSION_INACTIVITY_LIMIT_SECONDS > values.SESSION_MAX_LIFETIME_SECONDS) {
    names.push('SESSION_INACTIVITY_LIMIT_SECONDS', 'SESSION_MAX_LIFETIME_SECONDS');
  }
  if (values.PAGE_SIZE_PROJECTS_DEFAULT > values.PAGE_SIZE_PUBLIC_MAX) {
    names.push('PAGE_SIZE_PROJECTS_DEFAULT', 'PAGE_SIZE_PUBLIC_MAX');
  }
  if (values.PAGE_SIZE_ARTICLES_DEFAULT > values.PAGE_SIZE_PUBLIC_MAX) {
    names.push('PAGE_SIZE_ARTICLES_DEFAULT', 'PAGE_SIZE_PUBLIC_MAX');
  }
  if (values.PAGE_SIZE_ADMIN_DEFAULT > values.PAGE_SIZE_ADMIN_MAX) {
    names.push('PAGE_SIZE_ADMIN_DEFAULT', 'PAGE_SIZE_ADMIN_MAX');
  }

  return [...new Set(names)];
}

const rateLimit = (max: number, windowSeconds: number): RateLimitConfig =>
  Object.freeze({ max, windowSeconds });

function buildConfig(values: ParsedEnvironment): Config {
  return Object.freeze({
    runtime: Object.freeze({
      environment: values.NODE_ENV,
      port: values.PORT,
      trustProxyHops: values.TRUST_PROXY_HOPS,
      shutdownTimeoutMs: values.SHUTDOWN_TIMEOUT_SECONDS * 1000,
    }),
    database: Object.freeze({ url: values.DATABASE_URL }),
    media: Object.freeze({
      cloudName: values.CLOUDINARY_CLOUD_NAME,
      apiKey: values.CLOUDINARY_API_KEY,
      apiSecret: values.CLOUDINARY_API_SECRET,
      folder: values.CLOUDINARY_FOLDER,
    }),
    session: Object.freeze({
      accessTokenSecret: values.ACCESS_TOKEN_SECRET,
      refreshTokenSecret: values.REFRESH_TOKEN_SECRET,
      accessTokenTtlSeconds: values.ACCESS_TOKEN_TTL_SECONDS,
      inactivityLimitSeconds: values.SESSION_INACTIVITY_LIMIT_SECONDS,
      maxLifetimeSeconds: values.SESSION_MAX_LIFETIME_SECONDS,
    }),
    limits: Object.freeze({
      pageSizes: Object.freeze({
        projects: values.PAGE_SIZE_PROJECTS_DEFAULT,
        articles: values.PAGE_SIZE_ARTICLES_DEFAULT,
        admin: values.PAGE_SIZE_ADMIN_DEFAULT,
        publicMaximum: values.PAGE_SIZE_PUBLIC_MAX,
        adminMaximum: values.PAGE_SIZE_ADMIN_MAX,
      }),
      uploadMaxBytes: values.UPLOAD_MAX_BYTES,
      duplicateMessageWindowSeconds: values.DUPLICATE_MESSAGE_WINDOW_SECONDS,
    }),
    rateLimits: Object.freeze({
      publicRead: rateLimit(
        values.RATE_LIMIT_PUBLIC_READ_MAX,
        values.RATE_LIMIT_PUBLIC_READ_WINDOW_SECONDS,
      ),
      contact: rateLimit(values.RATE_LIMIT_CONTACT_MAX, values.RATE_LIMIT_CONTACT_WINDOW_SECONDS),
      signIn: rateLimit(values.RATE_LIMIT_SIGN_IN_MAX, values.RATE_LIMIT_SIGN_IN_WINDOW_SECONDS),
      renewal: rateLimit(values.RATE_LIMIT_RENEWAL_MAX, values.RATE_LIMIT_RENEWAL_WINDOW_SECONDS),
      admin: rateLimit(values.RATE_LIMIT_ADMIN_MAX, values.RATE_LIMIT_ADMIN_WINDOW_SECONDS),
      upload: rateLimit(values.RATE_LIMIT_UPLOAD_MAX, values.RATE_LIMIT_UPLOAD_WINDOW_SECONDS),
    }),
    site: Object.freeze({ url: values.SITE_URL }),
  });
}
