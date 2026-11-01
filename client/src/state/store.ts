import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { editSnapshotReducer } from './edit-snapshot-slice';
import { notificationsReducer } from './notifications-slice';
import { sessionReducer } from './session-slice';
import { unsavedChangesReducer } from './unsaved-changes-slice';

/**
 * The four slices of client-only state, and nothing else (ARCHITECTURE_DESIGN.md Section 6.4,
 * TD-006). Server data is never copied into any of them. See docs/CLIENT_STATE.md before adding
 * a fifth: a new slice needs a review against that rule.
 */
const rootReducer = combineReducers({
  session: sessionReducer,
  notifications: notificationsReducer,
  editSnapshot: editSnapshotReducer,
  unsavedChanges: unsavedChangesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Makes a store. The application uses the one below. Tests make their own, so no test sees the
 * state of another.
 *
 * The Redux developer tools connect in development only. Nothing is persisted: a new page load
 * always starts from the initial state.
 */
export function createAppStore() {
  return configureStore({
    reducer: rootReducer,
    devTools: import.meta.env.DEV,
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];

export const store = createAppStore();
