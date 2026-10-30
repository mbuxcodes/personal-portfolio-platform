import { EventEmitter } from 'node:events';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHookRegistry } from '#lifecycle/hook-registry';
import { API_BASE_PATH } from './route-groups.js';
import { startServer, type RunningServer } from './start-server.js';
import { createDeferred } from '../test/deferred.js';
import { createManualTimers } from '../test/manual-timers.js';
import { createMemoryLogger } from '../test/memory-logger.js';
import { createTestPipelineConfig } from '../test/pipeline-config.js';

const running: RunningServer[] = [];

afterEach(() => {
  for (const { server } of running.splice(0)) {
    server.closeAllConnections();
    if (server.listening) server.close();
  }
});

function setup(overrides: { port?: number; secrets?: readonly string[] } = {}) {
  const fakeProcess = new EventEmitter();
  const { logger, entries, events, output } = createMemoryLogger({ secrets: overrides.secrets });
  const hooks = createHookRegistry(logger);
  const manual = createManualTimers();
  const exited = createDeferred<number>();
  const exit = vi.fn((code: number) => exited.resolve(code));

  const start = async (registerRoutes?: Parameters<typeof startServer>[0]['registerRoutes']) => {
    const result = await startServer({
      runtime: {
        environment: 'test',
        port: overrides.port ?? 0,
        trustProxyHops: 0,
        shutdownTimeoutMs: 10_000,
        logLevel: 'info',
      },
      pipeline: createTestPipelineConfig(),
      hooks,
      logger,
      process: fakeProcess,
      exit,
      registerRoutes,
      timers: manual.timers,
    });
    running.push(result);
    return result;
  };

  return { fakeProcess, entries, events, output, hooks, manual, exited, exit, start };
}

const urlOf = (server: RunningServer['server']): string =>
  `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

describe('startServer', () => {
  it('runs the startup hooks in order, then listens', async () => {
    const { hooks, events, start } = setup();
    const order: string[] = [];
    hooks.onStartup('first', () => void order.push('first'));
    hooks.onStartup('second', () => void order.push('second'));

    const { server, isListening } = await start();

    expect(isListening).toBe(true);
    expect(server.listening).toBe(true);
    expect(order).toEqual(['first', 'second']);
    expect(events()).toEqual([
      'server_starting',
      'startup_hook_completed',
      'startup_hook_completed',
      'server_listening',
    ]);
  });

  it('serves the application it builds', async () => {
    const { start } = setup();
    const { server } = await start(({ publicRoutes }) => {
      publicRoutes.get('/probe', (_request, response) => void response.send('served'));
    });

    const response = await fetch(`${urlOf(server)}${API_BASE_PATH}/probe`);

    expect(await response.text()).toBe('served');
  });

  it.each(['SIGTERM', 'SIGINT'])('shuts down gracefully on %s', async (signal) => {
    const { fakeProcess, hooks, exited, events, start } = setup();
    const order: string[] = [];
    hooks.onShutdown('first registered', () => void order.push('first registered'));
    hooks.onShutdown('last registered', () => void order.push('last registered'));
    const { server } = await start();

    fakeProcess.emit(signal);

    expect(await exited.promise).toBe(0);
    expect(server.listening).toBe(false);
    expect(order).toEqual(['last registered', 'first registered']);
    expect(events().filter((event) => event.startsWith('shutdown'))).toEqual([
      'shutdown_started',
      'shutdown_hook_completed',
      'shutdown_hook_completed',
      'shutdown_completed',
    ]);
  });

  it('lets an in-flight request finish after a termination signal, then exits cleanly', async () => {
    const { fakeProcess, hooks, exit, exited, start } = setup();
    const entered = createDeferred();
    const release = createDeferred();
    const hook = vi.fn();
    hooks.onShutdown('recorder', hook);
    const { server } = await start(({ publicRoutes }) => {
      publicRoutes.get('/slow', (_request, response) => {
        entered.resolve();
        void release.promise.then(() => response.send('finished'));
      });
    });

    const inFlight = fetch(`${urlOf(server)}${API_BASE_PATH}/slow`);
    await entered.promise;
    fakeProcess.emit('SIGTERM');

    expect(exit).not.toHaveBeenCalled();
    expect(hook).not.toHaveBeenCalled();

    release.resolve();
    expect(await (await inFlight).text()).toBe('finished');
    expect(await exited.promise).toBe(0);
    expect(hook).toHaveBeenCalledTimes(1);
  });

  it('closes a request that exceeds the time limit and still exits cleanly', async () => {
    const { fakeProcess, manual, exited, start } = setup();
    const entered = createDeferred();
    const release = createDeferred();
    const { server } = await start(({ publicRoutes }) => {
      publicRoutes.get('/stuck', (_request, response) => {
        entered.resolve();
        void release.promise.then(() => response.end());
      });
    });

    const stuck = fetch(`${urlOf(server)}${API_BASE_PATH}/stuck`);
    await entered.promise;
    fakeProcess.emit('SIGTERM');
    manual.fire();

    await expect(stuck).rejects.toThrow();
    expect(await exited.promise).toBe(0);
    release.resolve();
  });

  it('logs an unhandled rejection, shuts down, and exits with a failure code', async () => {
    const { fakeProcess, hooks, entries, exited, start } = setup();
    const hook = vi.fn();
    hooks.onShutdown('recorder', hook);
    await start();

    fakeProcess.emit('unhandledRejection', new Error('nobody caught this'));

    expect(await exited.promise).toBe(1);
    expect(hook).toHaveBeenCalledTimes(1);
    expect(entries.find((entry) => entry.event === 'fatal_error')).toMatchObject({
      level: 'fatal',
      kind: 'unhandledRejection',
      error: { message: 'nobody caught this' },
    });
  });

  it('logs an uncaught exception, shuts down, and exits with a failure code', async () => {
    const { fakeProcess, hooks, entries, exited, start } = setup();
    const hook = vi.fn();
    hooks.onShutdown('recorder', hook);
    await start();

    fakeProcess.emit('uncaughtException', new TypeError('unexpected'));

    expect(await exited.promise).toBe(1);
    expect(hook).toHaveBeenCalledTimes(1);
    expect(entries.find((entry) => entry.event === 'fatal_error')).toMatchObject({
      level: 'fatal',
      kind: 'uncaughtException',
      error: { name: 'TypeError', message: 'unexpected' },
    });
  });

  it('exits with a failure code, without listening, when a startup hook fails', async () => {
    const { hooks, entries, exited, start } = setup();
    const shutdownHook = vi.fn();
    hooks.onStartup('database', () => {
      throw new Error('cannot connect');
    });
    hooks.onShutdown('database', shutdownHook);

    const { server, isListening } = await start();

    expect(isListening).toBe(false);
    expect(server.listening).toBe(false);
    expect(await exited.promise).toBe(1);
    expect(shutdownHook).toHaveBeenCalledTimes(1);
    expect(entries.find((entry) => entry.event === 'startup_failed')).toMatchObject({
      level: 'fatal',
    });
  });

  it('exits with a failure code when the port is already in use', async () => {
    const occupied = createServer();
    await new Promise<void>((resolve) => occupied.listen(0, resolve));
    const { start, exited, entries } = setup({ port: (occupied.address() as AddressInfo).port });

    try {
      const { isListening } = await start();

      expect(isListening).toBe(false);
      expect(await exited.promise).toBe(1);
      expect(entries.find((entry) => entry.event === 'startup_failed')).toMatchObject({
        error: { message: expect.stringContaining('EADDRINUSE') },
      });
    } finally {
      occupied.close();
    }
  });

  it('registers signal and fatal-error handling once, on the process it is given', async () => {
    const { fakeProcess, start } = setup();

    await start();

    for (const event of ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']) {
      expect(fakeProcess.listenerCount(event)).toBe(1);
    }
  });

  it('logs the start with the environment, port, and level, and never a secret', async () => {
    const { start, entries, output } = setup();

    await start();

    expect(entries[0]).toEqual({
      level: 'info',
      time: expect.any(String),
      event: 'server_starting',
      environment: 'test',
      port: 0,
      logLevel: 'info',
    });
    expect(output()).not.toMatch(/CANARY|SUPER_SECRET_123/);
  });

  it('writes one completion entry for each request the running server handles', async () => {
    const { start, entries } = setup();
    const { server } = await start(({ publicRoutes }) => {
      publicRoutes.get('/probe', (_request, response) => void response.send('served'));
    });

    await fetch(`${urlOf(server)}${API_BASE_PATH}/probe`);
    await fetch(`${urlOf(server)}${API_BASE_PATH}/probe`);

    const completions = entries.filter((entry) => entry.event === 'request_completed');
    expect(completions).toHaveLength(2);
    expect(completions[0]).toMatchObject({ method: 'GET', status: 200 });
    expect(completions[0]?.requestId).not.toBe(completions[1]?.requestId);
  });

  it('logs startup and shutdown problems without exposing a secret', async () => {
    const { hooks, start, exited, output, entries } = setup({ secrets: ['SUPER_SECRET_123'] });
    hooks.onStartup('database', () => {
      throw new Error('could not connect using SUPER_SECRET_123');
    });
    hooks.onShutdown('database', () => {
      throw new Error('could not close SUPER_SECRET_123');
    });

    await start();
    await exited.promise;

    expect(entries.map((entry) => entry.event)).toEqual(
      expect.arrayContaining([
        'startup_hook_failed',
        'startup_failed',
        'shutdown_started',
        'shutdown_hook_failed',
        'shutdown_completed',
      ]),
    );
    expect(output()).not.toContain('SUPER_SECRET_123');
  });
});
