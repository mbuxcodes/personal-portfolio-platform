import type {
  ItemResponse,
  ListResponse,
  PaginatedResponse,
  PaginationMeta,
} from '../types/common';

/*
 * Small, generic readers for the contract's envelopes (API_DESIGN.md Section 8.1). An endpoint
 * uses one as its `transformResponse`, so a feature receives the record or the list and never
 * the `{ data, meta }` wrapper.
 */

/** `{ data: T }` becomes `T`. */
export function unwrapItem<T>(response: ItemResponse<T>): T {
  return response.data;
}

/** `{ data: T[], meta: { totalItems } }` becomes the list. */
export function unwrapList<T>(response: ListResponse<T>): T[] {
  return response.data;
}

export interface Page<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** `{ data: T[], meta: { pagination } }` becomes the items and the page position. */
export function unwrapPage<T>(response: PaginatedResponse<T>): Page<T> {
  return { items: response.data, pagination: response.meta.pagination };
}
