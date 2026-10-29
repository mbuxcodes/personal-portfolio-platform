export const REDACTED = '[REDACTED]';

const TRUNCATED = '[Truncated]';
const CIRCULAR = '[Circular]';
const MAX_DEPTH = 10;

/**
 * Redaction is decided by the NAME of a field, never by remembering to remove it at each call site.
 * Names are compared in lower case with everything but letters and digits removed, so
 * `Set-Cookie`, `set_cookie`, and `setCookie` are the same name.
 *
 * What is never logged: credentials, session values, secrets, the content of contact messages,
 * visitor and sender details, article bodies, and request bodies (ARCHITECTURE_DESIGN.md 15.3).
 */
const SENSITIVE_NAME_FRAGMENTS = [
  'authorization',
  'cookie',
  'password',
  'passwd',
  'token',
  'secret',
  'credential',
  'apikey',
  'privatekey',
  'session',
  'email',
  'sender',
  'forwardedfor',
  'payload',
];

const SENSITIVE_NAMES = new Set([
  'body',
  'requestbody',
  'responsebody',
  'articlebody',
  'content',
  'messagetext',
  'subject',
  'ip',
  'ipaddress',
  'clientip',
  'remoteaddress',
]);

const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export function isSensitiveName(name: string): boolean {
  const normalized = normalize(name);
  return (
    SENSITIVE_NAMES.has(normalized) ||
    SENSITIVE_NAME_FRAGMENTS.some((fragment) => normalized.includes(fragment))
  );
}

export interface RedactorOptions {
  /**
   * Secret values known to the server. Wherever one appears inside any text, it is removed, even
   * under a field name that looks harmless, such as an error message that repeats a connection string.
   */
  secrets?: readonly string[];
}

export type Redact = (value: unknown) => unknown;

/** Builds a function that returns a redacted copy of anything. The input is never changed. */
export function createRedactor({ secrets = [] }: RedactorOptions = {}): Redact {
  // Longest first, so a secret that contains another one is removed whole.
  const secretValues = [...new Set(secrets.filter((secret) => secret.length > 0))].sort(
    (a, b) => b.length - a.length,
  );

  const scrub = (text: string): string =>
    secretValues.reduce((result, secret) => result.split(secret).join(REDACTED), text);

  const walk = (value: unknown, depth: number, ancestors: WeakSet<object>): unknown => {
    if (typeof value === 'string') return scrub(value);
    if (typeof value !== 'object' || value === null) return value;
    if (depth >= MAX_DEPTH) return TRUNCATED;
    if (ancestors.has(value)) return CIRCULAR;

    ancestors.add(value);
    try {
      if (value instanceof Error) {
        const { name, message, stack } = value;
        return walk({ name, message, stack }, depth + 1, ancestors);
      }
      if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1, ancestors));
      if ('toJSON' in value && typeof value.toJSON === 'function') {
        return walk(value.toJSON(), depth + 1, ancestors);
      }
      return Object.fromEntries(
        Object.entries(value).map(([name, entry]) => [
          name,
          isSensitiveName(name) ? REDACTED : walk(entry, depth + 1, ancestors),
        ]),
      );
    } finally {
      ancestors.delete(value);
    }
  };

  return (value) => walk(value, 0, new WeakSet());
}
