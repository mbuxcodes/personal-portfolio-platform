import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGracefulShutdown } from '#lifecycle/graceful-shutdown';
import { createHookRegistry } from '#lifecycle/hook-registry';
import { createDeferred } from '../../test/deferred.js';
import { createManualTimers } from '../../test/manual-timers.js';
import { createMemoryLogger } from '../../test/memory-logger.js';

type Handler = (request: IncomingMessage, response: ServerResponse) => void;

const servers: Server[] = [];

async function listenOnFreePort(handler: Handler): Promise<{ server: Server; url: string }> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    if (server.listening) server.close();
  }
});

function setup(server: Server, overrides: { timeoutMs?: number } = {}) {
  const { logger, events } = createMemoryLogger();
  const hooks = createHookRegistry(logger);
  const manual = createManualTimers();
  const exited = createDeferred<number>();
  const exit = vi.fn((code: number) => exited.resolve(code));
  const shutdown = createGracefulShutdown({
    server,
    hooks,
    logger,
    timeoutMs: overrides.timeoutMs ?? 10_000,
    exit,
    timers: manual.timers,
  });
  return { shutdown, hooks, exit, exited, events, manual };
}

describe('graceful shutdown', () => {
  it('stops accepting new connections as soon as it starts', async () => {
    const { server, url } = await listenOnFreePort((_request, response) => response.end('ok'));
    const { shutdown, exited } = setup(server);

    const done = shutdown('SIGTERM');

    expect(server.listening).toBe(false);
    await expect(fetch(url)).rejects.toThrow();
    await done;
    expect(await exited.promise).toBe(0);
  });

  it('lets an in-flight request finish before running hooks and exiting', async () => {
    const order: string[] = [];
    const entered = createDeferred();
    const release = createDeferred();
    const { server, url } = await listenOnFreePort((_request, response) => {
      entered.resolve();
      void release.promise.then(() => {
        order.push('request finished');
        response.end('done');
      });
    });
    const { shutdown, hooks, exit, exited } = setup(server);
    hooks.onShutdown('recorder', () => void order.push('hook'));

    const inFlight = fetch(url);
    await entered.promise;
    void shutdown('SIGTERM');

    expect(exit).not.toHaveBeenCalled();
    expect(order).toEqual([]);

    release.resolve();
    const response = await inFlight;
    expect(await response.text()).toBe('done');
    expect(await exited.promise).toBe(0);
    expect(order).toEqual(['request finished', 'hook']);
  });

  it('closes the remaining connections once the time limit passes, then continues', async () => {
    const entered = createDeferred();
    const release = createDeferred();
    const { server, url } = await listenOnFreePort((_request, response) => {
      entered.resolve();
      void release.promise.then(() => response.end());
    });
    const { shutdown, hooks, exited, events, manual } = setup(server);
    const hook = vi.fn();
    hooks.onShutdown('recorder', hook);

    const stuck = fetch(url);
    await entered.promise;
    void shutdown('SIGTERM');
    expect(hook).not.toHaveBeenCalled();

    manual.fire();

    await expect(stuck).rejects.toThrow();
    expect(await exited.promise).toBe(0);
    expect(hook).toHaveBeenCalledTimes(1);
    expect(events()).toEqual([
      'shutdown_started',
      'shutdown_timeout',
      'shutdown_hook_completed',
      'shutdown_completed',
    ]);
    release.resolve();
  });

  it('cancels the time limit when requests finish in time', async () => {
    const { server } = await listenOnFreePort((_request, response) => response.end());
    const { shutdown, exited, manual } = setup(server);

    await shutdown('SIGTERM');

    expect(await exited.promise).toBe(0);
    expect(manual.isPending()).toBe(false);
  });

  it('exits with a failure code when a shutdown hook fails, after running the others', async () => {
    const { server } = await listenOnFreePort((_request, response) => response.end());
    const { shutdown, hooks, exited } = setup(server);
    const later = vi.fn();
    hooks.onShutdown('later', later);
    hooks.onShutdown('broken', () => {
      throw new Error('close failed');
    });

    await shutdown('SIGTERM');

    expect(await exited.promise).toBe(1);
    expect(later).toHaveBeenCalledTimes(1);
  });

  it('runs once when called twice, and a failure code is never downgraded', async () => {
    const { server } = await listenOnFreePort((_request, response) => response.end());
    const { shutdown, hooks, exit, events } = setup(server);
    const hook = vi.fn();
    hooks.onShutdown('recorder', hook);

    const first = shutdown('SIGTERM');
    const second = shutdown('uncaughtException', 1);
    await Promise.all([first, second]);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(events()).toContain('shutdown_already_running');
  });

  it('still runs hooks and exits when the server never started listening', async () => {
    const server = createServer();
    const { shutdown, hooks, exit } = setup(server);
    const hook = vi.fn();
    hooks.onShutdown('recorder', hook);

    await shutdown('startup_failed', 1);

    expect(hook).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
