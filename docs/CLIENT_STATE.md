# Client State

What the Redux store holds, and the rule that keeps it small. This note belongs to milestone M3.3. The decisions behind it are TD-006 (Redux Toolkit), TD-007 (RTK Query), ADR-09, and ADR-22. The state itself is defined in `ARCHITECTURE_DESIGN.md` Section 6.4.

## 1. The rule

> **No server data may ever be stored inside Redux slices.**

Data that comes from the API (projects, articles, the Admin's details, lists, counts, error objects) belongs to the server-state cache (RTK Query, M3.4). It is read from the cache wherever it is needed. It is never copied into a slice, never mirrored there "for convenience", and never kept in a second place that can drift from the cache.

Why:

- **One source of truth.** A copy in a slice goes stale the moment the cache revalidates. Public pages must show a change on the next visitor load (BR-006).
- **No duplicate machinery.** Caching, refetching, and invalidation already exist in RTK Query. A hand-made cache in a slice is a second, worse one.
- **A small store.** If client-only state stays small, the store stays easy to review (TD-006, Long-Term Impact).

## 2. What the store holds

Exactly four slices, and nothing else. Each is client-only: it describes this browser tab, not the server's records.

| Slice (`state` key) | File                             | Holds                                                                                 | Why it is client-side                                                              |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `session`           | `state/session-slice.ts`         | `status`: `unknown`, `signed-in`, or `signed-out`                                     | Whether this tab has a session. Who the Admin is comes from the current-user query |
| `notifications`     | `state/notifications-slice.ts`   | A short list of `{ id, kind, message }`. Text only, at most 5                         | Messages after actions (FR-ADMIN-GEN-001)                                          |
| `editSnapshot`      | `state/edit-snapshot-slice.ts`   | `null`, or `{ path, values }`: the form content when the session ended during editing | Restored after sign-in (ADR-22)                                                    |
| `unsavedChanges`    | `state/unsaved-changes-slice.ts` | `true` or `false`                                                                     | Whether the form on screen has unsaved changes (FR-ADMIN-GEN-002)                  |

`state/store.ts` builds the store and `state/hooks.ts` has the typed hooks. Import everything through `@/state`, and use `useAppDispatch` and `useAppSelector`, never the plain React Redux hooks.

### The edit snapshot is memory only

The snapshot (ADR-22) exists only in the memory of the open page.

- It is never written to browser storage, never sent to the server, and never persisted by any package. There is no persistence middleware and none may be added.
- A page reload loses it. This is the accepted trade-off of ADR-22 (`ARCHITECTURE_DESIGN.md` Section 26, A-6).
- The store keeps its own copy of the content, so the form's object stays editable.
- It is cleared as soon as the content has been restored (`editSnapshotCleared`).
- It holds the page (`path`) so content is restored only on the page it came from.

### Notifications

`NotificationRegion` (`app/notification-region.tsx`) is mounted once in the application shell. It has two live regions that are always in the page:

- success messages go to a polite `status` region,
- failure messages go to an `alert` region.

Raise a message with `dispatch(notificationAdded('success', 'Project saved.'))`. The words are chosen by the caller. Never pass an API response or an error object. The regions are hidden from sight (`sr-only`). The visible notification display is built in M3.5 from the same state.

## 3. Review checklist

Use this whenever a change touches `client/src/state`, or adds anything that reads or writes the store. A "no" to any item blocks the change.

- [ ] **No server data in a slice.** Nothing that came from an API response is stored: not a record, not a list, not a count, not the Admin's details, not an error object. (Text a caller writes itself, such as a notification message, is allowed.)
- [ ] **Still exactly four slices.** A new slice is a change to `ARCHITECTURE_DESIGN.md` Section 6.4 and TD-006 first, and a review against the rule in Section 1. The server-state cache (M3.4) is the only addition planned, and it holds server data by design.
- [ ] **No persistence.** No browser storage, no browser database, no cookie, no persistence package, and no store subscriber that saves state.
- [ ] **The snapshot stays in memory and is cleared after use.**
- [ ] **No fetching, caching, or middleware** added in `state/`. Reading the API is the data-access layer's job.
- [ ] **State is serializable and strict.** No class instances, functions, `Date` objects, or files in state. TypeScript strict passes with no `any`.
- [ ] **Typed hooks only**, imported from `@/state`.

`client/src/state/state-rules.test.ts` and `store.test.ts` check the mechanical items above. The rest is for the reviewer.

## 4. Developer tools

The Redux developer tools connect in development only (`devTools: import.meta.env.DEV`). In a production build the store does not offer itself to the browser extension.
