import { createSlice } from '@reduxjs/toolkit';

const initialState = false as boolean;

/**
 * Whether the form on screen has unsaved changes (FR-ADMIN-GEN-002).
 *
 * A form sets it as the Admin edits and clears it after a save. `useUnsavedChangesBlocker`
 * (`shared-ui`) takes the value as an argument, so a feature reads this flag and passes it in.
 */
const unsavedChangesSlice = createSlice({
  name: 'unsavedChanges',
  initialState,
  reducers: {
    unsavedChangesMarked() {
      return true;
    },
    unsavedChangesCleared() {
      return false;
    },
  },
});

export const { unsavedChangesMarked, unsavedChangesCleared } = unsavedChangesSlice.actions;
export const unsavedChangesReducer = unsavedChangesSlice.reducer;

export const selectHasUnsavedChanges = (state: { unsavedChanges: boolean }): boolean =>
  state.unsavedChanges;
