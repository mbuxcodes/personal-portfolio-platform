import { createJsonLogger, type Logger } from '../src/utils/logger.js';

export type LoggedEntry = Record<string, unknown> & { level: string; event: string };

/** A logger that keeps what it writes, so tests can assert on structured entries. */
export function createMemoryLogger(): {
  logger: Logger;
  entries: LoggedEntry[];
  events: () => string[];
} {
  const entries: LoggedEntry[] = [];
  const logger = createJsonLogger((line) => {
    entries.push(JSON.parse(line) as LoggedEntry);
  });
  return { logger, entries, events: () => entries.map((entry) => entry.event) };
}
