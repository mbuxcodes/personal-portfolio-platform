/*
 * The values that decide how the client talks to the API. Nothing else in the client spells out
 * an address or a cache rule (ARCHITECTURE_DESIGN.md Section 6.1: "Only the data-access layer
 * knows the API's addresses and shapes").
 */

/** The base path of every API route (API_DESIGN.md Section 14.1). */
export const API_BASE_PATH = '/api/v1';

/**
 * The client and the API share one origin (ARCHITECTURE_DESIGN.md Section 14.4), so no API
 * address is configured. The path is made absolute against the page's own origin, which gives the
 * same request in a browser and lets tests intercept it.
 */
export function resolveApiBaseUrl(): string {
  return new URL(API_BASE_PATH, window.location.origin).href;
}

/**
 * A request that gets no answer within this time fails with a friendly network error instead of
 * leaving a page waiting forever (FR-ERR-007: a failure never leaves a blank page).
 */
export const API_REQUEST_TIMEOUT_MS = 30_000;

/** AUTH-02: renews the session without a new sign-in (API_DESIGN.md Section 5.2). */
export const SESSION_RENEWAL_PATH = 'auth/refresh';

/**
 * Requests that never start a renewal, even when they answer `SESSION_EXPIRED`.
 *
 * - `auth/refresh` is the renewal itself. Renewing because the renewal expired would loop.
 * - `auth/login` and `auth/logout` are public and run before or after a session, so a renewal
 *   cannot help them.
 */
export const RENEWAL_EXEMPT_PATHS: readonly string[] = [
  SESSION_RENEWAL_PATH,
  'auth/login',
  'auth/logout',
];

/**
 * The freshness rule for cached reads (BR-006, API_DESIGN.md Section 8.9, ARCHITECTURE_DESIGN.md
 * Section 6.5): a change appears on the next visitor load, and cached data is never reused as
 * fresh across page loads.
 *
 * - `keepUnusedDataFor: 0`: when no page is using a read any more, its data is dropped at once.
 *   Entering a page therefore never starts from what an earlier page left behind.
 * - `refetchOnMountOrArgChange: true`: a page that mounts a read asks the server again, even if a
 *   component that stays on screen (the header, say) still holds the same read.
 *
 * Nothing is persisted, so a page reload always starts with an empty cache as well (CLIENT_STATE.md).
 *
 * The rule is global on purpose: admin and authentication responses are never cached either
 * (API_DESIGN.md Section 8.9), and one rule for every read leaves no exception to forget.
 */
export const CACHE_FRESHNESS = {
  keepUnusedDataFor: 0,
  refetchOnMountOrArgChange: true,
} as const;
