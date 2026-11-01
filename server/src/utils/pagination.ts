import { z } from 'zod';

/** The default and the largest page size of one endpoint (API_DESIGN.md Section 9.1). */
export interface PageLimits {
  defaultPageSize: number;
  maxPageSize: number;
}

/**
 * The query fields `page` and `pageSize` (API_DESIGN.md Section 9.2), as a shape that an endpoint
 * puts into its own query schema next to its filters:
 *
 *     z.strictObject({ ...paginationQuery(limits), featured: z.enum(['true']).optional() })
 *
 * Query values are text, so each is checked as whole-number digits first. This rejects `1e3`,
 * `0x10`, `-1`, `1.5`, and blanks. `page` is 1 or greater, and `pageSize` is from 1 to the
 * endpoint's maximum. A value that breaks a rule is reported by the validation helper as
 * `422 INVALID_QUERY_PARAMETER`, and a missing value gets the default. The defaults and maxima come
 * from configuration (`limits.pageSizes`), and the caller passes them in.
 */
export function paginationQuery({ defaultPageSize, maxPageSize }: PageLimits) {
  const sizeMessage = `Page size must be a whole number from 1 to ${maxPageSize}.`;

  return {
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a whole number of 1 or more.')
      .default('1')
      .transform(Number)
      .pipe(z.number().int().min(1, 'Page must be a whole number of 1 or more.')),
    pageSize: z
      .string()
      .regex(/^\d+$/, sizeMessage)
      .default(String(defaultPageSize))
      .transform(Number)
      .pipe(z.number().int().min(1, sizeMessage).max(maxPageSize, sizeMessage)),
  };
}

/** The whole query schema of an endpoint that has pagination and no filters. */
export const paginationQuerySchema = (limits: PageLimits) =>
  z.strictObject(paginationQuery(limits));

/** `meta.pagination` of a paginated collection (API_DESIGN.md Section 9.3). */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Builds the metadata for the page that was served. `totalPages` is 0 when there are no items. A
 * page beyond the last one is not an error: the list is empty and the totals are still true.
 */
export function buildPaginationMeta(input: {
  page: number;
  pageSize: number;
  totalItems: number;
}): PaginationMeta {
  return {
    page: input.page,
    pageSize: input.pageSize,
    totalItems: input.totalItems,
    totalPages: Math.ceil(input.totalItems / input.pageSize),
  };
}
