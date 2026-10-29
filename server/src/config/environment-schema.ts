import { z } from 'zod';

/** Secrets must be at least this long. `openssl rand -hex 32` produces 64 characters. */
const MIN_SECRET_LENGTH = 32;
/** A long secret made of a few repeated characters ("aaaa...", "abababab...") is still weak. */
const MIN_DISTINCT_SECRET_CHARACTERS = 8;

const MAX_INTEGER = Number.MAX_SAFE_INTEGER;

/** The log levels the server supports, most severe first (ARCHITECTURE_DESIGN.md Section 15.1). */
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug'] as const;

export type LogLevelName = (typeof LOG_LEVELS)[number];

const digits = z.string().regex(/^\d+$/);

/**
 * A whole number written as digits only, so "1e3", "0x10", "-1", and " 5" are all rejected.
 * The default is written as the text it would have in the environment, and is what the
 * documents specify (TD-016, TD-027, TD-047, API_DESIGN.md Sections 9 and 7.10).
 */
const integerOr = (fallback: string, min: number, max = MAX_INTEGER) =>
  digits.default(fallback).transform(Number).pipe(z.number().int().min(min).max(max));

/** A secret has no default. */
const secret = z
  .string()
  .min(MIN_SECRET_LENGTH)
  .refine((value) => new Set(value).size >= MIN_DISTINCT_SECRET_CHARACTERS);

const text = z.string().min(1);

const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Every environment variable the server reads, with its rule. The keys are the variable names,
 * so a validation problem always points at a name and never needs to repeat a value.
 * A new setting is added here, and in `configuration.ts`, and nowhere else (TD-046).
 */
export const environmentSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: integerOr('5000', 0, 65535),
  SHUTDOWN_TIMEOUT_SECONDS: integerOr('10', 1, 120),
  TRUST_PROXY_HOPS: integerOr('0', 0, 10),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),

  // Database (secret: the connection string carries credentials)
  DATABASE_URL: z.string().regex(/^mongodb(\+srv)?:\/\/\S+$/),

  // Media service (secrets: the key and the secret)
  CLOUDINARY_CLOUD_NAME: text,
  CLOUDINARY_API_KEY: text,
  CLOUDINARY_API_SECRET: text,
  CLOUDINARY_FOLDER: text,

  // Session: signing secrets, then lifetimes in seconds (TD-016: 15 minutes, 2 hours, 24 hours)
  ACCESS_TOKEN_SECRET: secret,
  REFRESH_TOKEN_SECRET: secret,
  ACCESS_TOKEN_TTL_SECONDS: integerOr('900', 1),
  SESSION_INACTIVITY_LIMIT_SECONDS: integerOr('7200', 1),
  SESSION_MAX_LIFETIME_SECONDS: integerOr('86400', 1),

  // Limits: page sizes (API_DESIGN.md Section 9.1), upload size (5 MB), duplicate window (60 s)
  PAGE_SIZE_PROJECTS_DEFAULT: integerOr('12', 1),
  PAGE_SIZE_ARTICLES_DEFAULT: integerOr('10', 1),
  PAGE_SIZE_ADMIN_DEFAULT: integerOr('20', 1),
  PAGE_SIZE_PUBLIC_MAX: integerOr('50', 1),
  PAGE_SIZE_ADMIN_MAX: integerOr('100', 1),
  UPLOAD_MAX_BYTES: integerOr('5242880', 1),
  DUPLICATE_MESSAGE_WINDOW_SECONDS: integerOr('60', 1),

  // Rate limits, one window and one maximum per route group (TD-027)
  RATE_LIMIT_PUBLIC_READ_MAX: integerOr('120', 1),
  RATE_LIMIT_PUBLIC_READ_WINDOW_SECONDS: integerOr('60', 1),
  RATE_LIMIT_CONTACT_MAX: integerOr('5', 1),
  RATE_LIMIT_CONTACT_WINDOW_SECONDS: integerOr('3600', 1),
  RATE_LIMIT_SIGN_IN_MAX: integerOr('10', 1),
  RATE_LIMIT_SIGN_IN_WINDOW_SECONDS: integerOr('900', 1),
  RATE_LIMIT_RENEWAL_MAX: integerOr('20', 1),
  RATE_LIMIT_RENEWAL_WINDOW_SECONDS: integerOr('900', 1),
  RATE_LIMIT_ADMIN_MAX: integerOr('120', 1),
  RATE_LIMIT_ADMIN_WINDOW_SECONDS: integerOr('60', 1),
  RATE_LIMIT_UPLOAD_MAX: integerOr('20', 1),
  RATE_LIMIT_UPLOAD_WINDOW_SECONDS: integerOr('600', 1),

  // Site: public address, for page metadata and crawler rules
  SITE_URL: z.string().refine(isHttpUrl),
});

export type ParsedEnvironment = z.infer<typeof environmentSchema>;
