import { normalizeError } from '../errors/normalize-error';
import type { ApiError } from '../types/errors';

/**
 * How one renewal attempt ended.
 *
 * - `renewed`: the server renewed the session. The original requests may be repeated.
 * - `ended`: the server says the session is over (`SESSION_EXPIRED`, or no session at all). The
 *   Admin must sign in again.
 * - `unavailable`: the attempt itself failed (no network, a server fault, a rate limit). The
 *   session may still be valid, so it is NOT ended: signing the Admin out because of a flaky
 *   connection would lose their work for no reason. The error is given back to the requests.
 */
export type RenewalResult =
  { status: 'renewed' } | { status: 'ended' } | { status: 'unavailable'; error: ApiError };

export interface SessionRenewal {
  /**
   * Counts the attempts that have finished. A request reads it BEFORE it is sent. If it has
   * changed by the time the request fails with `SESSION_EXPIRED`, a renewal finished while the
   * request was away, so that renewal's result applies to the request and it must not start
   * another.
   */
  readonly epoch: number;
  /** The result of the most recent finished attempt, or `null` before the first. */
  readonly lastResult: RenewalResult | null;
  /**
   * Runs `attempt` unless one is already running, in which case it joins that one. Every caller
   * of one attempt receives the same result. This is the single flight: any number of concurrent
   * expired requests make exactly one renewal request.
   */
  renew(attempt: () => Promise<RenewalResult>): Promise<RenewalResult>;
}

/**
 * Makes the bookkeeping for one session. One exists per base query, and the application has one
 * base query, so there is one renewal at a time for the whole page.
 */
export function createSessionRenewal(): SessionRenewal {
  let inFlight: Promise<RenewalResult> | null = null;
  let epoch = 0;
  let lastResult: RenewalResult | null = null;

  return {
    get epoch() {
      return epoch;
    },

    get lastResult() {
      return lastResult;
    },

    renew(attempt) {
      if (inFlight !== null) {
        return inFlight;
      }

      inFlight = Promise.resolve()
        .then(attempt)
        .catch(
          // An attempt is not meant to throw. If one does, the session is not known to be over.
          (cause: unknown): RenewalResult => ({
            status: 'unavailable',
            error: normalizeError(cause),
          }),
        )
        .then((result) => {
          // Recorded before the waiting requests continue, so none of them can see a half-finished state.
          lastResult = result;
          epoch += 1;
          return result;
        })
        .finally(() => {
          inFlight = null;
        });

      return inFlight;
    },
  };
}
