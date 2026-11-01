import { describe, expect, it } from 'vitest';
import {
  MAX_NOTIFICATIONS,
  notificationAdded,
  notificationDismissed,
  notificationsCleared,
  notificationsReducer,
  selectNotifications,
  type AppNotification,
} from './notifications-slice';

const empty: AppNotification[] = [];

function add(state: AppNotification[], kind: 'success' | 'error', message: string) {
  return notificationsReducer(state, notificationAdded(kind, message));
}

describe('notifications reducer', () => {
  it('starts empty', () => {
    expect(notificationsReducer(undefined, { type: 'test/init' })).toEqual([]);
  });

  it('adds a success message', () => {
    const state = add(empty, 'success', 'Project saved.');

    expect(state).toHaveLength(1);
    expect(state[0]).toMatchObject({ kind: 'success', message: 'Project saved.' });
  });

  it('adds a failure message', () => {
    const state = add(empty, 'error', 'The project could not be saved.');

    expect(state[0]).toMatchObject({ kind: 'error', message: 'The project could not be saved.' });
  });

  it('gives every notification its own id, even when the text is the same', () => {
    const state = add(add(empty, 'success', 'Saved.'), 'success', 'Saved.');

    expect(state[0].id).not.toBe(state[1].id);
    expect(state[0].id).not.toBe('');
  });

  it('keeps notifications in the order they arrived', () => {
    const state = add(add(add(empty, 'success', 'one'), 'error', 'two'), 'success', 'three');

    expect(state.map((notification) => notification.message)).toEqual(['one', 'two', 'three']);
  });

  it.each(['', '   ', '\n\t'])('ignores a blank message (%j)', (message) => {
    expect(add(empty, 'success', message)).toEqual([]);
  });

  it(`keeps at most ${MAX_NOTIFICATIONS}, and drops the oldest first`, () => {
    let state = empty;

    for (let count = 1; count <= MAX_NOTIFICATIONS + 2; count += 1) {
      state = add(state, 'success', `message ${count}`);
    }

    expect(state).toHaveLength(MAX_NOTIFICATIONS);
    expect(state[0].message).toBe('message 3');
    expect(state.at(-1)?.message).toBe(`message ${MAX_NOTIFICATIONS + 2}`);
  });

  it('dismisses one notification by id and keeps the others', () => {
    const state = add(add(empty, 'success', 'keep'), 'error', 'remove');
    const removed = state[1];

    const next = notificationsReducer(state, notificationDismissed(removed.id));

    expect(next.map((notification) => notification.message)).toEqual(['keep']);
  });

  it('does nothing when the id is unknown', () => {
    const state = add(empty, 'success', 'Saved.');

    expect(notificationsReducer(state, notificationDismissed('no-such-id'))).toEqual(state);
  });

  it('clears every notification', () => {
    const state = add(add(empty, 'success', 'one'), 'error', 'two');

    expect(notificationsReducer(state, notificationsCleared())).toEqual([]);
  });

  it('holds text only: each notification has an id, a kind, and a message', () => {
    const [notification] = add(empty, 'success', 'Saved.');

    expect(Object.keys(notification).sort()).toEqual(['id', 'kind', 'message']);
  });

  it('selects the list', () => {
    const state = add(empty, 'success', 'Saved.');

    expect(selectNotifications({ notifications: state })).toBe(state);
  });
});
