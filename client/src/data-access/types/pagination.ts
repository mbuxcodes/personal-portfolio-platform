/*
 * Pagination conventions. Source: API_DESIGN.md Section 9 and 10.
 *
 * Page and page size are part of the identity of a cached read (ARCHITECTURE_DESIGN.md
 * Section 6.5). RTK Query keys a cache entry by the arguments it is given, so `{}` and
 * `{ page: 1, pageSize: 12 }` would be two entries for the same data. A feature therefore runs
 * its arguments through `resolvePagination` before they reach a query.
 */

/** The query arguments of every paginated list (Section 9.2). Both are optional. */
export interface PaginationArgs {
  /** Integer, 1 or greater. Defaults to 1. */
  page?: number;
  /** Integer, 1 up to the endpoint's maximum. Defaults per endpoint. */
  pageSize?: number;
}

/** What one endpoint allows for `pageSize` (Section 9.1). */
export interface PaginationLimits {
  defaultPageSize: number;
  maxPageSize: number;
}

/** The five paginated endpoints and their limits (Section 9.1). Every other list is returned in full. */
export const PAGINATION_LIMITS = {
  publicProjects: { defaultPageSize: 12, maxPageSize: 50 },
  publicArticles: { defaultPageSize: 10, maxPageSize: 50 },
  adminProjects: { defaultPageSize: 20, maxPageSize: 100 },
  adminArticles: { defaultPageSize: 20, maxPageSize: 100 },
  adminMessages: { defaultPageSize: 20, maxPageSize: 100 },
} as const satisfies Record<string, PaginationLimits>;

/** Pagination with every value filled in, so it makes one cache identity per page. */
export interface ResolvedPagination {
  page: number;
  pageSize: number;
}

/**
 * Fills in defaults and keeps both values inside the contract's range.
 *
 * The server answers a value outside the range with `422 INVALID_QUERY_PARAMETER` (Section 9.2).
 * A request that is certain to fail helps nobody, so an impossible value is corrected here
 * instead: a missing, fractional or non-numeric value falls back to the default, and a number
 * outside the range is moved to the nearest allowed value.
 */
export function resolvePagination(
  args: PaginationArgs | undefined,
  limits: PaginationLimits,
): ResolvedPagination {
  const page = Number.isFinite(args?.page) ? Math.trunc(args?.page ?? 1) : 1;
  const pageSize = Number.isFinite(args?.pageSize)
    ? Math.trunc(args?.pageSize ?? limits.defaultPageSize)
    : limits.defaultPageSize;

  return {
    page: Math.max(1, page),
    pageSize: Math.min(Math.max(1, pageSize), limits.maxPageSize),
  };
}
