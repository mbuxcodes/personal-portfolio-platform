import { describe, expect, it } from 'vitest';
import { createHookRegistry, StartupHookError } from '#lifecycle/hook-registry';
import { createDeferred } from '../../test/deferred.js';
import { createMemoryLogger } from '../../test/memory-logger.js';

describe('hook registry', () => {
  it('runs startup hooks in the order they were registered', async () => {
    const order: string[] = [];
    const registry = createHookRegistry(createMemoryLogger().logger);
    registry.onStartup('first', () => void order.push('first'));
    registry.onStartup('second', () => void order.push('second'));
    registry.onStartup('third', () => void order.push('third'));

    await registry.runStartup();

    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('runs shutdown hooks in the reverse order of registration', async () => {
    const order: string[] = [];
    const registry = createHookRegistry(createMemoryLogger().logger);
    registry.onShutdown('first', () => void order.push('first'));
    registry.onShutdown('second', () => void order.push('second'));
    registry.onShutdown('third', () => void order.push('third'));

    const failures = await registry.runShutdown();

    expect(order).toEqual(['third', 'second', 'first']);
    expect(failures).toEqual([]);
  });

  it('waits for each asynchronous hook before starting the next', async () => {
    const events: string[] = [];
    const gate = createDeferred();
    const registry = createHookRegistry(createMemoryLogger().logger);
    registry.onStartup('slow', async () => {
      events.push('slow:start');
      await gate.promise;
      events.push('slow:end');
    });
    registry.onStartup('next', () => void events.push('next'));

    const running = registry.runStartup();
    await Promise.resolve();
    expect(events).toEqual(['slow:start']);

    gate.resolve();
    await running;
    expect(events).toEqual(['slow:start', 'slow:end', 'next']);
  });

  it('stops at the first failing startup hook and reports which one failed', async () => {
    const order: string[] = [];
    const cause = new Error('connection refused');
    const registry = createHookRegistry(createMemoryLogger().logger);
    registry.onStartup('ok', () => void order.push('ok'));
    registry.onStartup('broken', () => {
      throw cause;
    });
    registry.onStartup('never', () => void order.push('never'));

    const error = await registry.runStartup().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(StartupHookError);
    expect((error as StartupHookError).hookName).toBe('broken');
    expect((error as StartupHookError).cause).toBe(cause);
    expect(order).toEqual(['ok']);
  });

  it('runs every shutdown hook even when one fails, and returns the failures', async () => {
    const order: string[] = [];
    const registry = createHookRegistry(createMemoryLogger().logger);
    registry.onShutdown('first', () => void order.push('first'));
    registry.onShutdown('broken', () => {
      throw new Error('close failed');
    });
    registry.onShutdown('last', () => void order.push('last'));

    const failures = await registry.runShutdown();

    expect(order).toEqual(['last', 'first']);
    expect(failures.map((failure) => failure.name)).toEqual(['broken']);
  });

  it('logs hook names and outcomes', async () => {
    const { logger, events } = createMemoryLogger();
    const registry = createHookRegistry(logger);
    registry.onStartup('database', () => undefined);
    registry.onShutdown('database', () => undefined);

    await registry.runStartup();
    await registry.runShutdown();

    expect(events()).toEqual(['startup_hook_completed', 'shutdown_hook_completed']);
  });

  it('rejects a second hook with the same name', () => {
    const registry = createHookRegistry(createMemoryLogger().logger);
    registry.onStartup('database', () => undefined);
    registry.onShutdown('database', () => undefined);

    expect(() => registry.onStartup('database', () => undefined)).toThrow(/already registered/);
    expect(() => registry.onShutdown('database', () => undefined)).toThrow(/already registered/);
  });

  it('rejects registration once startup or shutdown has begun', async () => {
    const registry = createHookRegistry(createMemoryLogger().logger);

    await registry.runStartup();
    expect(() => registry.onStartup('late', () => undefined)).toThrow(/after startup began/);

    await registry.runShutdown();
    expect(() => registry.onShutdown('late', () => undefined)).toThrow(/after shutdown began/);
  });
});
