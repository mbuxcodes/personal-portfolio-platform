import type { Shutdown } from '#lifecycle/graceful-shutdown';
import { describeError, type Logger } from '#utils/logger';

export interface FatalErrorPolicyOptions {
  /** The process, or anything that emits the same events. */
  process: Pick<NodeJS.EventEmitter, 'on'>;
  logger: Logger;
  shutdown: Shutdown;
}

/**
 * Policy for failures nothing handled: log in structure, shut down gracefully, and exit with a
 * failure code. The process never continues after one, and nothing fails silently.
 */
export function registerFatalErrorPolicy({
  process,
  logger,
  shutdown,
}: FatalErrorPolicyOptions): void {
  const handle = (kind: 'uncaughtException' | 'unhandledRejection') => (error: unknown) => {
    logger.fatal('fatal_error', { kind, error: describeError(error) });
    void shutdown(kind, 1);
  };

  process.on('uncaughtException', handle('uncaughtException'));
  process.on('unhandledRejection', handle('unhandledRejection'));
}
