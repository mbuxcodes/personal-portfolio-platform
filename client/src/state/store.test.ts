import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAppStore,
  editSnapshotCleared,
  editSnapshotSaved,
  notificationAdded,
  selectEditSnapshot,
  selectHasUnsavedChanges,
  selectNotifications,
  selectSessionStatus,
  sessionEnded,
  sessionStarted,
  unsavedChangesCleared,
  unsavedChangesMarked,
} from '@/state';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('store', () => {
  // When M3.4 adds the server-state cache, this test is the review gate: it must be changed on
  // purpose, and only for that cache, never for a slice that holds server data.
  it('contains exactly the four client-only slices', () => {
    const state = createAppStore().getState();

    expect(Object.keys(state).sort()).toEqual([
      'editSnapshot',
      'notifications',
      'session',
      'unsavedChanges',
    ]);
  });

  it('starts from the documented initial state', () => {
    expect(createAppStore().getState()).toEqual({
      session: { status: 'unknown' },
      notifications: [],
      editSnapshot: null,
      unsavedChanges: false,
    });
  });

  it('routes each action to its own slice', () => {
    const store = createAppStore();

    store.dispatch(sessionStarted());
    expect(selectSessionStatus(store.getState())).toBe('signed-in');

    store.dispatch(notificationAdded('success', 'Saved.'));
    expect(selectNotifications(store.getState())).toHaveLength(1);

    store.dispatch(editSnapshotSaved({ path: '/admin/articles', values: { title: 'Draft' } }));
    expect(selectEditSnapshot(store.getState())?.values).toEqual({ title: 'Draft' });

    store.dispatch(unsavedChangesMarked());
    expect(selectHasUnsavedChanges(store.getState())).toBe(true);
  });

  it('keeps the other slices unchanged when one changes', () => {
    const store = createAppStore();

    store.dispatch(unsavedChangesMarked());
    store.dispatch(sessionEnded());

    expect(store.getState()).toEqual({
      session: { status: 'signed-out' },
      notifications: [],
      editSnapshot: null,
      unsavedChanges: true,
    });
  });

  it('keeps the edit snapshot through a session ending, so it can be restored after sign-in', () => {
    const store = createAppStore();

    store.dispatch(sessionStarted());
    store.dispatch(editSnapshotSaved({ path: '/admin/articles', values: { title: 'Draft' } }));
    store.dispatch(sessionEnded());

    expect(selectSessionStatus(store.getState())).toBe('signed-out');
    expect(selectEditSnapshot(store.getState())).not.toBeNull();

    store.dispatch(sessionStarted());
    store.dispatch(editSnapshotCleared());

    expect(selectEditSnapshot(store.getState())).toBeNull();
  });

  it('gives each store its own state, so a new page load starts empty', () => {
    const first = createAppStore();
    first.dispatch(editSnapshotSaved({ path: '/admin/articles', values: { title: 'Draft' } }));
    first.dispatch(unsavedChangesMarked());

    const second = createAppStore();

    expect(selectEditSnapshot(second.getState())).toBeNull();
    expect(selectHasUnsavedChanges(second.getState())).toBe(false);
  });

  it('never writes to browser storage, whatever is dispatched', () => {
    const setLocal = vi.spyOn(Storage.prototype, 'setItem');
    const store = createAppStore();

    store.dispatch(sessionStarted());
    store.dispatch(notificationAdded('error', 'Failed.'));
    store.dispatch(editSnapshotSaved({ path: '/admin/articles', values: { body: 'Long draft' } }));
    store.dispatch(unsavedChangesMarked());
    store.dispatch(unsavedChangesCleared());
    store.dispatch(editSnapshotCleared());

    expect(setLocal).not.toHaveBeenCalled();
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
  });

  it('never opens a browser database', () => {
    const open = vi.fn();
    vi.stubGlobal('indexedDB', { open });

    const store = createAppStore();
    store.dispatch(editSnapshotSaved({ path: '/admin/articles', values: { body: 'Draft' } }));

    expect(open).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
