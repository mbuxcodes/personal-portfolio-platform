# Data Access

The one layer that talks to the API (`client/src/data-access`). This note belongs to milestone M3.4. The decisions behind it are TD-007 (RTK Query), ADR-09, ADR-21 (the contract is the source of truth), BR-006, and FR-ERR-007.

## 1. What the layer provides

| Part                | Where                          | Purpose                                                                                  |
| ------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- |
| Base API            | `api/base-api.ts`              | The one `createApi`. It has **no endpoints**. Features add theirs with `injectEndpoints` |
| Base query          | `api/base-query.ts`            | Sends credentials and JSON, renews an expired session, and normalizes every error        |
| Renewal bookkeeping | `api/session-renewal.ts`       | The single flight: one renewal at a time, shared by every waiting request                |
| Configuration       | `api/api-config.ts`            | The API base path, the timeout, the renewal path, and the freshness rule                 |
| Error normalizer    | `errors/normalize-error.ts`    | Turns any failure into `{ code, message, details, requestId }`                           |
| Field error mapper  | `errors/field-error-mapper.ts` | Maps error `details` onto form fields, including nested fields and list items            |
| Tags                | `tags/`                        | Resource tag types and the invalidation helpers                                          |
| Contract types      | `types/`                       | Request and response types copied from `API_DESIGN.md`                                   |
| Fixtures, mocks     | `fixtures/`, `mocks/`          | The contract's examples as typed data, and a mock API that serves them. **Tests only**   |

Import from `@/data-access`. Fixtures and mocks are imported from `@/data-access/fixtures` and `@/data-access/mocks` and are never exported by the main entry, so they cannot reach the production bundle.

## 2. The error shape

Every failure a feature receives is one `ApiError`:

```ts
{
  (code, message, details, requestId);
}
```

- Decide behavior from `code`, never from `message`.
- `message` is plain language and safe to show (FR-ERR-001).
- `details` holds field problems, `[]` when there are none.
- `requestId` is the server's reference, or `null` when the request never reached the server.

A network failure or a timeout is `NETWORK_ERROR` with a friendly message (FR-ERR-007). Browser wording such as "Failed to fetch" is never passed on.

## 3. Session renewal

When a request answers `SESSION_EXPIRED` (API_DESIGN.md Section 5.1):

1. The base query calls the renewal endpoint **once**, however many requests expired. Requests that expired while a renewal is running wait for it.
2. If the renewal succeeds, each original request is repeated **once**.
3. If the renewal is refused, the store is told (`session` becomes `signed-out`) and the original error is returned. Nothing is retried.
4. If the renewal fails for a reason that says nothing about the session (no network, a server fault), the session is **kept** and the error is returned.

What prevents loops: the renewal request never starts a renewal; a request is repeated at most once; a request that expired before a finished renewal reuses that renewal's result; and a repeated request that still answers `SESSION_EXPIRED` ends the session.

## 4. Tags: every write declares what it makes stale

**Every mutation must declare `invalidatesTags`.** There is no mutation without one. A write that truly changes nothing cached says so with an empty list and a comment giving the reason.

- Every read declares what it contains with `providesTags` (`providesList`, `itemTag`).
- One tag type per resource, shared by its public and admin reads (`tags/tag-types.ts`).
- A change to a record makes stale the record, every list of its resource, and the Dashboard (`staleAfterWrite`).

`data-access-rules.test.ts` fails when a mutation has no `invalidatesTags`.

## 5. Public freshness (BR-006)

A change to public content must appear on the next visitor load, so:

- `keepUnusedDataFor: 0`: data is dropped as soon as no page uses it.
- `refetchOnMountOrArgChange: true`: a page that mounts a read asks the server again, even if another component still holds the same read.
- Nothing is persisted, so a reload starts with an empty cache.

The rule is global, so no read can forget it (`state/api-public-freshness.test.tsx`).

## 6. Pagination

Paginated lists take `PaginationArgs` (`page`, `pageSize`). A feature passes them through `resolvePagination` with the endpoint's limits from `PAGINATION_LIMITS`, so `{}` and `{ page: 1, pageSize: 12 }` are one cache entry.

## 7. Adding an endpoint (from M4 onward)

Create `features/<group>/<name>/api/<name>-api.ts` and call `baseApi.injectEndpoints`. Type the request and response from `types/`. Give every read `providesTags` and every write `invalidatesTags`. Test it against the mock API (`startMockServer()`), never against a hand-made response.
