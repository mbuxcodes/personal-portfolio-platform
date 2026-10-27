import type { Server } from 'node:http';
import type { HookRegistry } from '#lifecycle/hook-registry';
import { describeError, type Logger } from '#utils/logger';

export interface Timers {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface GracefulShutdownOptions {
  server: Server;
  hooks: HookRegistry;
  logger: Logger;
  /** How long in-flight requests may take to finish before their connections are closed. */
  timeoutMs: number;
  exit: (code: number) => void;
  /** Replaceable so tests can trigger the time limit without waiting. */
  timers?: Timers;
}

/** Starts shutdown. Never rejects. The exit code only ever goes up: a failure is never downgraded. */
export type Shutdown = (reason: string, exitCode?: number) => Promise<void>;

/**
 * Implements TD-047. Shutdown steps, in order:
 * 1. Stop accepting new connections.
 * 2. Let in-flight requests finish, up to the time limit, then close what remains.
 * 3. Run the shutdown hooks.
 * 4. Log, then exit.
 * Calling it again while it runs does not start a second shutdown.
 */
export function createGracefulShutdown(options: GracefulShutdownOptions): Shutdown {
  const { server, hooks, logger, timeoutMs, exit } = options;
  const timers: Timers = options.timers ?? { setTimeout, clearTimeout };

  let running: Promise<void> | undefined;
  let exitCode = 0;

  // A keep-alive connection becomes idle when its last request finishes, and would hold shutdown
  // open until it times out. Close such connections as soon as they go idle.
  server.on('request', (_request, response) => {
    response.once('finish', () => {
      if (running) setImmediate(() => server.closeIdleConnections());
    });
  });

  const stopAccepting = (): Promise<void> =>
    new Promise((resolve) => {
      if (!server.listening) {
        resolve();
        return;
      }
      server.close(() => resolve());
      server.closeIdleConnections();
    });

  const run = async (reason: string): Promise<void> => {
    try {
      logger.info('shutdown_started', { reason, timeoutMs });
      const drained = stopAccepting();

      let handle: unknown;
      const timedOut = new Promise<'timeout'>((resolve) => {
        handle = timers.setTimeout(() => resolve('timeout'), timeoutMs);
      });
      const outcome = await Promise.race([drained.then(() => 'drained' as const), timedOut]);

      if (outcome === 'timeout') {
        logger.warn('shutdown_timeout', { timeoutMs });
        server.closeAllConnections();
        await drained;
      } else {
        timers.clearTimeout(handle);
      }

      const failures = await hooks.runShutdown();
      if (failures.length > 0) exitCode = Math.max(exitCode, 1);

      logger.info('shutdown_completed', { reason, exitCode });
    } catch (error) {
      exitCode = Math.max(exitCode, 1);
      logger.error('shutdown_failed', { reason, error: describeError(error) });
    } finally {
      exit(exitCode);
    }
  };

  return (reason, code = 0) => {
    exitCode = Math.max(exitCode, code);
    if (running) {
      logger.warn('shutdown_already_running', { reason });
      return running;
    }
    running = run(reason);
    return running;
  };
}
