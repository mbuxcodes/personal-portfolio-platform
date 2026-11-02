import { describe, expect, it } from 'vitest';
import { DASHBOARD_TAG, itemTag, listTag, providesList, staleAfterWrite } from './tag-helpers';
import { LIST_TAG_ID, TAG_TYPES } from './tag-types';

describe('tag types', () => {
  it('has one type for each resource, with no duplicates', () => {
    expect(new Set(TAG_TYPES).size).toBe(TAG_TYPES.length);
    expect([...TAG_TYPES].sort()).toEqual([
      'Article',
      'Certification',
      'CurrentUser',
      'Dashboard',
      'Education',
      'Experience',
      'Message',
      'Project',
      'Settings',
      'Skill',
    ]);
  });
});

describe('tag helpers', () => {
  it('builds list and item tags', () => {
    expect(listTag('Skill')).toEqual({ type: 'Skill', id: LIST_TAG_ID });
    expect(itemTag('Skill', 'abc')).toEqual({ type: 'Skill', id: 'abc' });
  });

  it('a list provides its list tag and one tag per record that has an id', () => {
    const items = [{ id: 'a' }, { id: 'b' }];

    expect(providesList('Message', items, (item) => item.id)).toEqual([
      { type: 'Message', id: LIST_TAG_ID },
      { type: 'Message', id: 'a' },
      { type: 'Message', id: 'b' },
    ]);
  });

  it('a public list, which has no ids, provides the list tag alone', () => {
    expect(providesList('Skill', [{ name: 'Git' }])).toEqual([listTag('Skill')]);
  });

  it('a read with no data yet still provides the list tag, so a later write refreshes it', () => {
    expect(providesList('Project', undefined, (item: { id: string }) => item.id)).toEqual([
      listTag('Project'),
    ]);
  });

  it('a write to a record makes the record, the lists and the Dashboard stale', () => {
    expect(staleAfterWrite('Project', 'p1')).toEqual([
      listTag('Project'),
      DASHBOARD_TAG,
      itemTag('Project', 'p1'),
    ]);
  });

  it('a write with no record id (a create, or the settings) makes the lists and the Dashboard stale', () => {
    expect(staleAfterWrite('Settings')).toEqual([listTag('Settings'), DASHBOARD_TAG]);
  });
});
