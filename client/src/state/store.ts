import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { baseApi, type DataAccessExtra } from '@/data-access';
import { editSnapshotReducer } from './edit-snapshot-slice';
import { notificationsReducer } from './notifications-slice';
import { sessionEnded, sessionReducer } from './session-slice';
import { unsavedChangesReducer } from './unsaved-changes-slice';

/**
 * Four slices of client-only state, and the server-state cache of RTK Query (ARCHITECTURE_DESIGN.md
 * Section 6.4 and 6.5, TD-006, TD-007). The cache is mounted under `api` by the library and is
 * the ONLY place server data lives. Server data is never copied into any of the four slices. See
 * docs/CLIENT_STATE.md before adding another slice: a new slice needs a review against that rule.
 */
const rootReducer = combineReducers({
  session: sessionReducer,
  notifications: notificationsReducer,
  editSnapshot: editSnapshotReducer,
  unsavedChanges: unsavedChangesReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * What the data-access layer is allowed to ask of this store. Data access may not import `state/`,
 * so the store hands it the one action it needs: "the session has ended".
 */
const dataAccessExtra: DataAccessExtra = { endSession: () => sessionEnded() };

/**
 * Makes a store. The application uses the one below. Tests make their own, so no test sees the
 * state of another (and no test shares an API cache with another).
 *
 * The Redux developer tools connect in development only. Nothing is persisted: a new page load
 * always starts from the initial state, with an empty cache (BR-006).
 */
export function createAppStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: dataAccessExtra } }).concat(
        baseApi.middleware,
      ),
    devTools: import.meta.env.DEV,
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];

export const store = createAppStore();
