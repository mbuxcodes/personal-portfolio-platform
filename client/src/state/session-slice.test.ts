import { describe, expect, it } from 'vitest';
import {
  selectSessionStatus,
  sessionEnded,
  sessionReducer,
  sessionStarted,
  type SessionState,
} from './session-slice';

const initial = sessionReducer(undefined, { type: 'test/init' });

describe('session reducer', () => {
  it('starts as unknown, because the current-user call has not answered', () => {
    expect(initial).toEqual({ status: 'unknown' });
  });

  it('becomes signed-in when a session is found', () => {
    expect(sessionReducer(initial, sessionStarted())).toEqual({ status: 'signed-in' });
  });

  it('becomes signed-out when the session ends', () => {
    const signedIn = sessionReducer(initial, sessionStarted());

    expect(sessionReducer(signedIn, sessionEnded())).toEqual({ status: 'signed-out' });
  });

  it('becomes signed-out when no session was ever found', () => {
    expect(sessionReducer(initial, sessionEnded())).toEqual({ status: 'signed-out' });
  });

  it('can start again after it ended, as after signing in again', () => {
    const ended = sessionReducer(initial, sessionEnded());

    expect(sessionReducer(ended, sessionStarted())).toEqual({ status: 'signed-in' });
  });

  it('does not change the state it was given', () => {
    const before: SessionState = Object.freeze({ status: 'unknown' });

    expect(() => sessionReducer(before, sessionStarted())).not.toThrow();
    expect(before).toEqual({ status: 'unknown' });
  });

  it('holds the status and nothing else, so no server data is kept here', () => {
    const state = sessionReducer(initial, sessionStarted());

    expect(Object.keys(state)).toEqual(['status']);
  });

  it('selects the status', () => {
    expect(selectSessionStatus({ session: { status: 'signed-in' } })).toBe('signed-in');
  });
});
