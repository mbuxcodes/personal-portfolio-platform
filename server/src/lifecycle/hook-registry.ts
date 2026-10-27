import { describeError, type Logger } from '#utils/logger';

export type LifecycleHook = () => void | Promise<void>;

export interface ShutdownHookFailure {
  name: string;
  error: unknown;
}

/** Thrown by `runStartup` when a startup hook fails. The original error is the `cause`. */
export class StartupHookError extends Error {
  readonly hookName: string;

  constructor(hookName: string, cause: unknown) {
    super(`Startup hook "${hookName}" failed`, { cause });
    this.name = 'StartupHookError';
    this.hookName = hookName;
  }
}

/**
 * The only way later milestones (database, media, and others) take part in the process lifecycle.
 *
 * Order is defined and never depends on timing:
 * - Startup hooks run one at a time, in the order they were registered.
 * - Shutdown hooks run one at a time, in the reverse order of registration, so whatever was
 *   registered last (and may depend on earlier resources) is released first.
 * Hooks may be asynchronous and are awaited. Shutdown hooks must be safe to run even if their
 * startup hook never ran or failed.
 */
export interface HookRegistry {
  onStartup(name: string, hook: LifecycleHook): void;
  onShutdown(name: string, hook: LifecycleHook): void;
  /** Stops at the first failing hook and throws a `StartupHookError`. */
  runStartup(): Promise<void>;
  /** Runs every hook even if some fail, and returns the failures. Never throws. */
  runShutdown(): Promise<ShutdownHookFailure[]>;
}

interface NamedHook {
  name: string;
  run: LifecycleHook;
}

export function createHookRegistry(logger: Logger): HookRegistry {
  const startupHooks: NamedHook[] = [];
  const shutdownHooks: NamedHook[] = [];
  let hasStartupBegun = false;
  let hasShutdownBegun = false;

  const register = (hooks: NamedHook[], kind: string, name: string, run: LifecycleHook): void => {
    if (hooks.some((hook) => hook.name === name)) {
      throw new Error(`A ${kind} hook named "${name}" is already registered`);
    }
    hooks.push({ name, run });
  };

  return {
    onStartup(name, hook) {
      if (hasStartupBegun)
        throw new Error(`Cannot register startup hook "${name}" after startup began`);
      register(startupHooks, 'startup', name, hook);
    },

    onShutdown(name, hook) {
      if (hasShutdownBegun)
        throw new Error(`Cannot register shutdown hook "${name}" after shutdown began`);
      register(shutdownHooks, 'shutdown', name, hook);
    },

    async runStartup() {
      hasStartupBegun = true;
      for (const { name, run } of startupHooks) {
        try {
          await run();
        } catch (error) {
          logger.error('startup_hook_failed', { hook: name, error: describeError(error) });
          throw new StartupHookError(name, error);
        }
        logger.info('startup_hook_completed', { hook: name });
      }
    },

    async runShutdown() {
      hasShutdownBegun = true;
      const failures: ShutdownHookFailure[] = [];
      for (const { name, run } of [...shutdownHooks].reverse()) {
        try {
          await run();
          logger.info('shutdown_hook_completed', { hook: name });
        } catch (error) {
          failures.push({ name, error });
          logger.error('shutdown_hook_failed', { hook: name, error: describeError(error) });
        }
      }
      return failures;
    },
  };
}
