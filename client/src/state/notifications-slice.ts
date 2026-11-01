import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

/** A success message is polite (`role="status"`). A failure message interrupts (`role="alert"`). */
export type NotificationKind = 'success' | 'error';

/**
 * One message for the Admin (FR-ADMIN-GEN-001). It holds text only. An API response or an error
 * object is never stored here: the code that raises a notification chooses the words.
 */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  message: string;
}

/**
 * The most notifications kept at once. When another arrives, the oldest is dropped, so the list
 * cannot grow without limit. A message is announced the moment it is added, so dropping an old
 * one never hides a message that has not been announced.
 */
export const MAX_NOTIFICATIONS = 5;

const initialState: AppNotification[] = [];

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notificationAdded: {
      reducer(state, action: PayloadAction<AppNotification>) {
        // A blank message would be announced as nothing, so it is ignored.
        if (action.payload.message.trim() === '') {
          return;
        }

        state.push(action.payload);

        if (state.length > MAX_NOTIFICATIONS) {
          state.splice(0, state.length - MAX_NOTIFICATIONS);
        }
      },
      // The id is made here, not in the reducer, because a reducer must give the same result
      // every time it runs.
      prepare(kind: NotificationKind, message: string) {
        return { payload: { id: nanoid(), kind, message } };
      },
    },
    notificationDismissed(state, action: PayloadAction<string>) {
      return state.filter((notification) => notification.id !== action.payload);
    },
    notificationsCleared() {
      return [];
    },
  },
});

export const { notificationAdded, notificationDismissed, notificationsCleared } =
  notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;

export const selectNotifications = (state: {
  notifications: AppNotification[];
}): AppNotification[] => state.notifications;
