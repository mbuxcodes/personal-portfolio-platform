import { createLogger, type Logger, type LogLevel } from '../src/utils/logger.js';

export type LoggedEntry = Record<string, unknown> & { level: string; event: string };

export interface MemoryLoggerOptions {
  level?: LogLevel;
  secrets?: readonly string[];
}

/** A logger that keeps what it writes, so tests can assert on structured entries and on raw output. */
export function createMemoryLogger(options: MemoryLoggerOptions = {}): {
  logger: Logger;
  entries: LoggedEntry[];
  events: () => string[];
  /** Everything written, exactly as it would appear in the log. */
  output: () => string;
} {
  const entries: LoggedEntry[] = [];
  const lines: string[] = [];
  const logger = createLogger({
    level: options.level ?? 'debug',
    secrets: options.secrets,
    write: (line) => {
      lines.push(line);
      entries.push(JSON.parse(line) as LoggedEntry);
    },
  });
  return {
    logger,
    entries,
    events: () => entries.map((entry) => entry.event),
    output: () => lines.join(''),
  };
}
