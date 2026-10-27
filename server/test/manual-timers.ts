import type { Timers } from '../src/lifecycle/graceful-shutdown.js';

/** Timers that never run on their own: the test decides when the time limit passes. */
export function createManualTimers(): {
  timers: Timers;
  fire: () => void;
  isPending: () => boolean;
} {
  let callback: (() => void) | undefined;
  return {
    timers: {
      setTimeout: (fn) => {
        callback = fn;
        return 1;
      },
      clearTimeout: () => {
        callback = undefined;
      },
    },
    fire: () => callback?.(),
    isPending: () => callback !== undefined,
  };
}
