import type { Response } from 'express';
import type { PaginationMeta } from '#utils/pagination';

/**
 * The success shapes of API_DESIGN.md Section 8.1. A controller chooses a mapper and then one of
 * these, so no controller writes `{ data }` or `{ meta }` by hand. They hold no rules and never
 * change what they are given. Errors are not sent from here: they are thrown and the central
 * error handler sends them.
 */

/** One resource: `{ data }`. */
export function sendItem<Data>(response: Response, data: Data, status = 200): void {
  response.status(status).json({ data });
}

/** One resource that was just created: `201` with `{ data }`. */
export function sendCreated<Data>(response: Response, data: Data): void {
  sendItem(response, data, 201);
}

/** A paginated list: `{ data, meta: { pagination } }`. */
export function sendPage<Item>(
  response: Response,
  items: readonly Item[],
  pagination: PaginationMeta,
): void {
  response.status(200).json({ data: items, meta: { pagination } });
}

/**
 * A list that is always returned in full: `{ data, meta: { totalItems } }`. The total is given,
 * not counted, because it counts records and not entries: the public skills are grouped by
 * category, so three skills are two entries (API_DESIGN.md Section 6.3).
 */
export function sendList<Item>(
  response: Response,
  items: readonly Item[],
  totalItems: number,
): void {
  response.status(200).json({ data: items, meta: { totalItems } });
}

/** Success with nothing to return: `204` and no body. */
export function sendNoContent(response: Response): void {
  response.status(204).end();
}
