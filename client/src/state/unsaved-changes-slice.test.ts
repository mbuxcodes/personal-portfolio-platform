import { describe, expect, it } from 'vitest';
import {
  selectHasUnsavedChanges,
  unsavedChangesCleared,
  unsavedChangesMarked,
  unsavedChangesReducer,
} from './unsaved-changes-slice';

describe('unsaved changes reducer', () => {
  it('starts with no unsaved changes', () => {
    expect(unsavedChangesReducer(undefined, { type: 'test/init' })).toBe(false);
  });

  it('is marked when the form changes', () => {
    expect(unsavedChangesReducer(false, unsavedChangesMarked())).toBe(true);
  });

  it('stays marked when marked again', () => {
    expect(unsavedChangesReducer(true, unsavedChangesMarked())).toBe(true);
  });

  it('is cleared after a save', () => {
    expect(unsavedChangesReducer(true, unsavedChangesCleared())).toBe(false);
  });

  it('stays clear when cleared again', () => {
    expect(unsavedChangesReducer(false, unsavedChangesCleared())).toBe(false);
  });

  it('selects the flag', () => {
    expect(selectHasUnsavedChanges({ unsavedChanges: true })).toBe(true);
    expect(selectHasUnsavedChanges({ unsavedChanges: false })).toBe(false);
  });
});
