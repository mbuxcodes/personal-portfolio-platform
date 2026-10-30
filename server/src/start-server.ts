import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp, type AppOptions } from './app.js';
import type { RuntimeConfig } from '#config/configuration';
import { registerFatalErrorPolicy } from '#lifecycle/fatal-error-policy';
import { createGracefulShutdown, type Shutdown, type Timers } from '#lifecycle/graceful-shutdown';
import type { HookRegistry } from '#lifecycle/hook-registry';
import type { PipelineConfig } from '#middleware/pipeline';
import { describeError, type Logger } from '#utils/logger';

export interface StartServerOptions {
  runtime: RuntimeConfig;
  /** What the shared request pipeline reads from configuration. */
  pipeline: PipelineConfig;
  hooks: HookRegistry;
  logger: Logger;
  /** The process, or anything that emits the same signal and error events. */
  process: Pick<NodeJS.EventEmitter, 'on'>;
  exit: (code: number) => void;
  registerRoutes?: AppOptions['registerRoutes'];
  timers?: Timers;
}

export interface RunningServer {
  server: Server;
  shutdown: Shutdown;
  /** False when startup failed. The process is then already shutting down with a failure code. */
  isListening: boolean;
}

/**
 * Starts the server: registers signal and fatal-error handling, runs the startup hooks, then listens.
 * Any startup failure takes the same graceful path as a fatal error and exits with a failure code.
 */
export async function startServer(options: StartServerOptions): Promise<RunningServer> {
  const { runtime, hooks, logger } = options;

  logger.info('server_starting', {
    environment: runtime.environment,
    port: runtime.port,
    logLevel: runtime.logLevel,
  });

  const app = createApp({
    logger,
    trustProxyHops: runtime.trustProxyHops,
    pipeline: options.pipeline,
    registerRoutes: options.registerRoutes,
  });
  const server = createServer(app);
  const shutdown = createGracefulShutdown({
    server,
    hooks,
    logger,
    timeoutMs: runtime.shutdownTimeoutMs,
    exit: options.exit,
    timers: options.timers,
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    options.process.on(signal, () => void shutdown(signal));
  }
  registerFatalErrorPolicy({ process: options.process, logger, shutdown });

  try {
    await hooks.runStartup();
    await listen(server, runtime.port);
  } catch (error) {
    logger.fatal('startup_failed', { error: describeError(error) });
    await shutdown('startup_failed', 1);
    return { server, shutdown, isListening: false };
  }

  logger.info('server_listening', { port: (server.address() as AddressInfo).port });
  return { server, shutdown, isListening: true };
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve();
    });
  });
}
