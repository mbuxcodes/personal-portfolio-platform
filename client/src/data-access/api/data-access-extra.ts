import type { UnknownAction } from '@reduxjs/toolkit';

/*
 * What the data-access layer needs FROM the application, handed over through the store.
 *
 * Data access may not import `state/` (ARCHITECTURE_DESIGN.md Section 6.1: it depends on
 * utilities and configuration only), yet when a session ends it must tell the store. The store
 * hands over the one function it needs as the thunk `extraArgument`, and RTK Query passes that to
 * the base query as `api.extra`. The dependency points one way: `state/` imports `data-access/`,
 * never the reverse, so there is no import cycle.
 */
export interface DataAccessExtra {
  /** Makes the action that records "the session has ended" (the `session` slice). */
  endSession: () => UnknownAction;
}

function isDataAccessExtra(value: unknown): value is DataAccessExtra {
  return (
    typeof value === 'object' &&
    value !== null &&
    'endSession' in value &&
    typeof value.endSession === 'function'
  );
}

/**
 * Reads the hand-over from the base query's `api.extra`. A store built without it is a
 * programming mistake, and a session that cannot be ended would leave the Admin looking signed
 * in, so it fails loudly instead of quietly doing nothing.
 */
export function getDataAccessExtra(extra: unknown): DataAccessExtra {
  if (!isDataAccessExtra(extra)) {
    throw new Error(
      'The store was created without the data-access hand-over. ' +
        'Pass { endSession } as the thunk extraArgument (see state/store.ts).',
    );
  }
  return extra;
}
