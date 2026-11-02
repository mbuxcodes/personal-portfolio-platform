import type { TagDescription } from '@reduxjs/toolkit/query';
import { LIST_TAG_ID, type TagType } from './tag-types';

/*
 * THE INVALIDATION CONVENTION (ARCHITECTURE_DESIGN.md Section 6.5: "Each write declares which
 * cached reads it makes stale, and they are refreshed").
 *
 * 1. Every READ declares what it contains with `providesTags`:
 *      - a list read provides the resource's list tag, plus one item tag for each record that has
 *        an identifier (`providesList`);
 *      - a single-record read provides that record's item tag (`itemTag`).
 *
 * 2. Every WRITE (`builder.mutation`) declares what it makes stale with `invalidatesTags`. There
 *    is no mutation without one. A write that truly changes nothing that is cached says so with
 *    an empty list and a comment that gives the reason, for example `invalidatesTags: []`.
 *    `staleAfterWrite` builds the usual answer.
 *
 * 3. A change to a record makes stale: the record, every list of its resource, and the Dashboard,
 *    whose counts are derived from all content (`staleAfterWrite`).
 *
 * `data-access-rules.test.ts` fails the build when a mutation has no `invalidatesTags`.
 */

type Tag = TagDescription<TagType>;

/** The tag that stands for every list of a resource. */
export function listTag(type: TagType): Tag {
  return { type, id: LIST_TAG_ID };
}

/** The tag of one record. Identifiers are opaque (API_DESIGN.md Section 3.2). */
export function itemTag(type: TagType, id: string): Tag {
  return { type, id };
}

/**
 * What a list read provides: the list tag, and an item tag for each record that has an
 * identifier. Public lists have none (API_DESIGN.md K-2), so they give no `getId` and provide the
 * list tag alone. It also works while there is no data yet (an error result), which provides just
 * the list tag, so a later write still refreshes the failed read.
 */
export function providesList<TItem>(
  type: TagType,
  items: readonly TItem[] | undefined,
  getId?: (item: TItem) => string,
): Tag[] {
  const tags: Tag[] = [listTag(type)];

  if (items !== undefined && getId !== undefined) {
    for (const item of items) {
      tags.push(itemTag(type, getId(item)));
    }
  }

  return tags;
}

/** The Dashboard overview as one tag. */
export const DASHBOARD_TAG: Tag = 'Dashboard';

/**
 * What a write to a record usually makes stale: the record (when it has an identifier), every
 * list of the resource, and the Dashboard.
 *
 * Pass no `id` for a write to a collection (a create) or to a single-record resource (Settings).
 */
export function staleAfterWrite(type: TagType, id?: string): Tag[] {
  const tags: Tag[] = [listTag(type), DASHBOARD_TAG];

  if (id !== undefined) {
    tags.push(itemTag(type, id));
  }

  return tags;
}
