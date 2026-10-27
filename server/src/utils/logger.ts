export type LogFields = Readonly<Record<string, unknown>>;

/**
 * The logging contract used across the server.
 *
 * Each call writes one structured entry: a stable event name plus fields.
 * `child` returns a logger that adds fixed fields to every entry, which is how a
 * request identifier will be attached later. The structured logger of TD-028 replaces
 * the implementation below and keeps this contract.
 */
export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  fatal(event: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

type LogLevel = 'info' | 'warn' | 'error' | 'fatal';

export type LogWriter = (line: string) => void;

/** Writes each entry as one line of JSON. The level, time, and event always win over supplied fields. */
export function createJsonLogger(
  write: LogWriter,
  bindings: LogFields = {},
  now: () => Date = () => new Date(),
): Logger {
  const log =
    (level: LogLevel) =>
    (event: string, fields: LogFields = {}): void => {
      write(
        `${JSON.stringify({ ...bindings, ...fields, level, time: now().toISOString(), event })}\n`,
      );
    };

  return {
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    fatal: log('fatal'),
    child: (childBindings) => createJsonLogger(write, { ...bindings, ...childBindings }, now),
  };
}

/** Turns anything that was thrown into fields that are safe to log. */
export function describeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'NonError', message: String(error) };
}
