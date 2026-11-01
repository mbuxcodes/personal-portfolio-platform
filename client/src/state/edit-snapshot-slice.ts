import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** A value that can be copied exactly. Forms hand over plain text, numbers, lists, and groups. */
export type SnapshotValue =
  string | number | boolean | null | SnapshotValue[] | { [key: string]: SnapshotValue };

/**
 * What the Admin had entered in a form when the session ended during editing (ADR-22).
 *
 * - `path` is the page of the form, so the content is restored on the same page.
 * - `values` is the form content.
 *
 * The snapshot lives in the memory of this page and nowhere else: it is not written to browser
 * storage, not sent to the server, and lost on a reload (ARCHITECTURE_DESIGN.md Section 26, A-6).
 */
export interface EditSnapshot {
  path: string;
  values: { [key: string]: SnapshotValue };
}

const initialState = null as EditSnapshot | null;

const editSnapshotSlice = createSlice({
  name: 'editSnapshot',
  initialState,
  reducers: {
    /** Keeps the form content. A second snapshot replaces the first: there is one session. */
    editSnapshotSaved: {
      reducer(_state, action: PayloadAction<EditSnapshot>) {
        return action.payload;
      },
      // The content is copied, so the form's own object is never shared with the store (the
      // store freezes what it holds, which would break a form that edits the object later).
      prepare(snapshot: EditSnapshot) {
        return { payload: structuredClone(snapshot) };
      },
    },
    /** Forgets the snapshot. Call it as soon as the content has been restored (ADR-22). */
    editSnapshotCleared() {
      return null;
    },
  },
});

export const { editSnapshotSaved, editSnapshotCleared } = editSnapshotSlice.actions;
export const editSnapshotReducer = editSnapshotSlice.reducer;

export const selectEditSnapshot = (state: { editSnapshot: EditSnapshot | null }) =>
  state.editSnapshot;

/** The snapshot, only when it was taken on `path`. Otherwise `null`. */
export const selectEditSnapshotForPath = (
  state: { editSnapshot: EditSnapshot | null },
  path: string,
): EditSnapshot | null => (state.editSnapshot?.path === path ? state.editSnapshot : null);
