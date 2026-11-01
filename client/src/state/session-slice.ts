import { createSlice } from '@reduxjs/toolkit';

/**
 * Whether an Admin session is active (ARCHITECTURE_DESIGN.md Section 6.4).
 *
 * - `unknown`: the current-user call has not answered yet, so the application does not know.
 *   Routing waits, rather than sending a signed-in Admin to the sign-in page by mistake.
 * - `signed-in`: the current-user call found a session.
 * - `signed-out`: there is no session, or it has ended.
 */
export type SessionStatus = 'unknown' | 'signed-in' | 'signed-out';

export interface SessionState {
  status: SessionStatus;
}

const initialState: SessionState = { status: 'unknown' };

/**
 * Only the status lives here. Who the Admin is comes from the current-user query (M3.4), because
 * the Admin's details are server data, and server data is never copied into a slice.
 */
const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    /** The current-user call found an active session. */
    sessionStarted(state) {
      state.status = 'signed-in';
    },
    /** The session ended: sign-out, expiry, or no session found. */
    sessionEnded(state) {
      state.status = 'signed-out';
    },
  },
});

export const { sessionStarted, sessionEnded } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;

export const selectSessionStatus = (state: { session: SessionState }): SessionStatus =>
  state.session.status;
