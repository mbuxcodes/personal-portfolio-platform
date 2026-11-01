import { describe, expect, it } from 'vitest';
import {
  editSnapshotCleared,
  editSnapshotReducer,
  editSnapshotSaved,
  selectEditSnapshot,
  selectEditSnapshotForPath,
  type EditSnapshot,
} from './edit-snapshot-slice';

const article: EditSnapshot = {
  path: '/admin/articles',
  values: { title: 'My draft', body: 'Long text', tags: ['a', 'b'], options: { featured: true } },
};

describe('edit snapshot reducer', () => {
  it('starts with no snapshot', () => {
    expect(editSnapshotReducer(undefined, { type: 'test/init' })).toBeNull();
  });

  it('keeps the form content and its page', () => {
    expect(editSnapshotReducer(null, editSnapshotSaved(article))).toEqual(article);
  });

  it('replaces an earlier snapshot, so there is never more than one', () => {
    const first = editSnapshotReducer(null, editSnapshotSaved(article));
    const second: EditSnapshot = { path: '/admin/projects', values: { name: 'Other' } };

    expect(editSnapshotReducer(first, editSnapshotSaved(second))).toEqual(second);
  });

  it('is cleared after use', () => {
    const saved = editSnapshotReducer(null, editSnapshotSaved(article));

    expect(editSnapshotReducer(saved, editSnapshotCleared())).toBeNull();
  });

  it('can be cleared when there is nothing to clear', () => {
    expect(editSnapshotReducer(null, editSnapshotCleared())).toBeNull();
  });

  it('keeps its own copy, so the form can keep changing its object', () => {
    const live: EditSnapshot = { path: '/admin/articles', values: { title: 'Draft', tags: ['a'] } };

    const saved = editSnapshotReducer(null, editSnapshotSaved(live));

    expect(saved).not.toBe(live);
    expect(saved?.values).not.toBe(live.values);

    // The store freezes what it holds. The form's own object must stay editable.
    expect(Object.isFrozen(live)).toBe(false);
    expect(() => {
      live.values.title = 'Changed';
      (live.values.tags as string[]).push('b');
    }).not.toThrow();
    expect(saved?.values).toEqual({ title: 'Draft', tags: ['a'] });
  });

  it('holds only content that can be copied exactly (it survives a JSON round trip)', () => {
    const saved = editSnapshotReducer(null, editSnapshotSaved(article));

    expect(JSON.parse(JSON.stringify(saved))).toEqual(article);
  });

  it('selects the snapshot', () => {
    expect(selectEditSnapshot({ editSnapshot: article })).toBe(article);
    expect(selectEditSnapshot({ editSnapshot: null })).toBeNull();
  });

  it('selects the snapshot only for the page it was taken on', () => {
    expect(selectEditSnapshotForPath({ editSnapshot: article }, '/admin/articles')).toBe(article);
    expect(selectEditSnapshotForPath({ editSnapshot: article }, '/admin/projects')).toBeNull();
    expect(selectEditSnapshotForPath({ editSnapshot: null }, '/admin/articles')).toBeNull();
  });
});
