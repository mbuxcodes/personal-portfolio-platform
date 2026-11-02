/*
 * Shapes shared by every endpoint. Source: API_DESIGN.md Sections 3.2, 8 and 9.
 * The contract is the single source of truth (ADR-21): when a shape here differs from the
 * document, the document is right and this file is wrong.
 */

/** ISO 8601, UTC, for example `2026-10-20T09:30:00Z` (Section 3.2). */
export type IsoTimestamp = string;

/** A calendar date, `YYYY-MM-DD` (Section 3.2). */
export type IsoDate = string;

/** Success shape "Item": one resource (Section 8.1). */
export interface ItemResponse<T> {
  data: T;
}

/** Success shape "Collection": a list with metadata (Section 8.1). */
export interface CollectionResponse<T, TMeta> {
  data: T[];
  meta: TMeta;
}

/** Metadata of the lists that are not paginated (Sections 6.3 to 6.6, 9.1). */
export interface TotalItemsMeta {
  totalItems: number;
}

/** Section 9.3. `totalPages` is `0` when there are no items. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Metadata of the paginated lists (Section 9.3). */
export interface PaginatedMeta {
  pagination: PaginationMeta;
}

/** A list that is always returned in full. */
export type ListResponse<T> = CollectionResponse<T, TotalItemsMeta>;

/** A list returned one page at a time. */
export type PaginatedResponse<T> = CollectionResponse<T, PaginatedMeta>;

/** The skill levels the contract allows (Sections 6.3 and 7.3). */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
