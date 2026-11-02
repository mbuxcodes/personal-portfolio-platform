import {
  fetchBaseQuery,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query';
import { normalizeError } from '../errors/normalize-error';
import type { ApiError } from '../types/errors';
import {
  API_REQUEST_TIMEOUT_MS,
  RENEWAL_EXEMPT_PATHS,
  SESSION_RENEWAL_PATH,
  resolveApiBaseUrl,
} from './api-config';
import { getDataAccessExtra } from './data-access-extra';
import { createSessionRenewal, type RenewalResult } from './session-renewal';

/** The base query of every endpoint: errors are always `ApiError`, never a raw fetch error. */
export type ApiBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  ApiError,
  object,
  FetchBaseQueryMeta
>;

export interface BaseQueryOptions {
  /** Overrides the address of the API. Tests use it. The application never does. */
  baseUrl?: string;
}

/** The path of a request without a leading slash or a query string: `/auth/refresh?x=1` is `auth/refresh`. */
function pathOf(args: string | FetchArgs): string {
  const url = typeof args === 'string' ? args : args.url;
  return (url.split('?')[0] ?? '').replace(/^\/+/, '');
}

function isRenewalExempt(args: string | FetchArgs): boolean {
  return RENEWAL_EXEMPT_PATHS.includes(pathOf(args));
}

/**
 * Builds the base query that every endpoint uses (TD-007: "a wrapper around the base request
 * layer for session renewal and error normalization").
 *
 * What it does, in order:
 *
 * 1. Sends the request with credentials (the session lives in cookies, API_DESIGN.md Section 5),
 *    JSON in and out, and a timeout.
 * 2. If the answer is `SESSION_EXPIRED`, renews the session ONCE for every request that failed
 *    that way, then repeats each original request exactly once (API_DESIGN.md Section 5.1).
 * 3. Turns every failure into an `ApiError`.
 *
 * Why a request cannot loop: the renewal request is exempt from renewal; each request is repeated
 * at most once; and a request that failed before a finished renewal reuses that renewal's result
 * instead of starting another. Renewals are therefore bounded by the number of times the session
 * really expires, never by the number of requests, retries, or components on screen.
 */
export function createRenewingBaseQuery(options: BaseQueryOptions = {}): ApiBaseQuery {
  const rawQuery = fetchBaseQuery({
    baseUrl: options.baseUrl ?? resolveApiBaseUrl(),
    credentials: 'include',
    timeout: API_REQUEST_TIMEOUT_MS,
    prepareHeaders: (headers) => {
      // `Content-Type: application/json` is set by the library for a JSON body. A file upload
      // (FormData) must not set it, because the browser adds the multipart boundary itself.
      headers.set('Accept', 'application/json');
      return headers;
    },
  });

  const renewal = createSessionRenewal();

  type RawResult = Awaited<ReturnType<typeof rawQuery>>;

  /** The same result with its error normalized. A success passes through untouched. */
  const normalized = (result: RawResult) =>
    result.error === undefined
      ? result
      : { error: normalizeError(result.error), meta: result.meta };

  const isSessionExpired = (result: RawResult) =>
    result.error !== undefined && normalizeError(result.error).code === 'SESSION_EXPIRED';

  const endSession = (api: BaseQueryApi) => {
    api.dispatch(getDataAccessExtra(api.extra).endSession());
  };

  /** One renewal request. It belongs to every waiting request, so no single request can cancel it. */
  async function requestRenewal(api: BaseQueryApi, extraOptions: object): Promise<RenewalResult> {
    const detachedApi: BaseQueryApi = { ...api, signal: new AbortController().signal };
    const result = await rawQuery(
      { url: SESSION_RENEWAL_PATH, method: 'POST' },
      detachedApi,
      extraOptions,
    );

    if (result.error === undefined) {
      return { status: 'renewed' };
    }

    const error = normalizeError(result.error);

    // API_DESIGN.md Section 5.1: a `SESSION_EXPIRED` answer means the session is over. Having no
    // credentials at all means the same. Any other failure says nothing about the session.
    if (error.code === 'SESSION_EXPIRED' || error.code === 'UNAUTHENTICATED') {
      endSession(api);
      return { status: 'ended' };
    }

    return { status: 'unavailable', error };
  }

  /** Waits for the renewal that applies to a request that started at `epochAtStart`. */
  function settleRenewal(
    epochAtStart: number,
    api: BaseQueryApi,
    extraOptions: object,
  ): Promise<RenewalResult> {
    const finished = renewal.lastResult;

    // A renewal finished while this request was away. Its result applies. Starting another
    // renewal for each late answer is how a burst of requests turns into a storm.
    if (renewal.epoch !== epochAtStart && finished !== null) {
      return Promise.resolve(finished);
    }

    return renewal.renew(() => requestRenewal(api, extraOptions));
  }

  return async (args, api, extraOptions) => {
    const epochAtStart = renewal.epoch;
    const first = await rawQuery(args, api, extraOptions);

    if (!isSessionExpired(first) || isRenewalExempt(args)) {
      return normalized(first);
    }

    const outcome = await settleRenewal(epochAtStart, api, extraOptions);

    if (outcome.status === 'ended') {
      // The session is over. The store was told once by the renewal itself.
      return normalized(first);
    }

    if (outcome.status === 'unavailable') {
      return { error: outcome.error, meta: first.meta };
    }

    // The session was renewed: repeat the original request ONCE. Never again, whatever it answers.
    const retried = await rawQuery(args, api, extraOptions);

    if (isSessionExpired(retried)) {
      // The server renewed the session yet still refuses it. Repeating would only loop, so the
      // session is treated as over.
      endSession(api);
    }

    return normalized(retried);
  };
}
