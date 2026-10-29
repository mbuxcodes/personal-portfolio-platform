import { pino, type Logger as PinoLogger } from 'pino';
import { createRedactor, type Redact } from '#utils/redaction';

/** The levels the server supports, most severe first. The configuration lists the same names. */
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogFields = Readonly<Record<string, unknown>>;

/**
 * The logging contract used across the server (TD-028).
 *
 * Each call writes one structured entry: a stable event name plus fields. `child` returns a logger
 * that adds fixed fields to every entry, which is how the request identifier is attached.
 * Everything a logger writes passes through the redaction rules, whoever calls it.
 */
export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  fatal(event: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

export type LogWriter = (line: string) => void;

export interface LoggerOptions {
  /** Receives each entry as one line of JSON ending in a newline. */
  write: LogWriter;
  /** The least severe level that is written. */
  level?: LogLevel;
  /** Secret values to remove from anything written. See `createRedactor`. */
  secrets?: readonly string[];
  bindings?: LogFields;
  now?: () => Date;
}

/** These three are always written by the logger, so a field can never replace or duplicate them. */
const RESERVED_FIELDS = new Set(['level', 'time', 'event']);

const withoutReservedFields = (fields: LogFields): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).filter(([name]) => !RESERVED_FIELDS.has(name)));

/** Writes structured JSON entries with Pino, with rule-based redaction applied to every entry. */
export function createLogger(options: LoggerOptions): Logger {
  const { write, level = 'info', secrets = [], bindings = {}, now = () => new Date() } = options;
  const redact = createRedactor({ secrets });

  const root = pino(
    {
      level,
      base: null,
      timestamp: () => `,"time":"${now().toISOString()}"`,
      formatters: {
        level: (label) => ({ level: label }),
        log: (entry) => redact(entry) as Record<string, unknown>,
      },
    },
    { write },
  );

  return wrap(root.child(redactedBindings(bindings, redact)), redact);
}

function redactedBindings(bindings: LogFields, redact: Redact): Record<string, unknown> {
  return redact(withoutReservedFields(bindings)) as Record<string, unknown>;
}

function wrap(instance: PinoLogger, redact: Redact): Logger {
  const log =
    (level: LogLevel) =>
    (event: string, fields: LogFields = {}): void => {
      instance[level]({ ...withoutReservedFields(fields), event });
    };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    fatal: log('fatal'),
    child: (bindings) => wrap(instance.child(redactedBindings(bindings, redact)), redact),
  };
}

/** Turns anything that was thrown into fields that are safe to log. */
export function describeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'NonError', message: String(error) };
}
