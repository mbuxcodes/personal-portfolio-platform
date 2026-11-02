import { describe, expect, it } from 'vitest';
import { PAGINATION_LIMITS, resolvePagination } from './pagination';

const limits = PAGINATION_LIMITS.publicProjects;

describe('PAGINATION_LIMITS', () => {
  it('matches API_DESIGN.md Section 9.1', () => {
    expect(PAGINATION_LIMITS).toEqual({
      publicProjects: { defaultPageSize: 12, maxPageSize: 50 },
      publicArticles: { defaultPageSize: 10, maxPageSize: 50 },
      adminProjects: { defaultPageSize: 20, maxPageSize: 100 },
      adminArticles: { defaultPageSize: 20, maxPageSize: 100 },
      adminMessages: { defaultPageSize: 20, maxPageSize: 100 },
    });
  });
});

describe('resolvePagination', () => {
  it('fills in the defaults, so no arguments and explicit defaults are one cache identity', () => {
    expect(resolvePagination(undefined, limits)).toEqual({ page: 1, pageSize: 12 });
    expect(resolvePagination({}, limits)).toEqual({ page: 1, pageSize: 12 });
    expect(resolvePagination({ page: 1, pageSize: 12 }, limits)).toEqual(
      resolvePagination({}, limits),
    );
  });

  it('keeps valid values', () => {
    expect(resolvePagination({ page: 3, pageSize: 25 }, limits)).toEqual({ page: 3, pageSize: 25 });
  });

  it('moves a value outside the contract range to the nearest allowed one', () => {
    expect(resolvePagination({ page: 0, pageSize: 0 }, limits)).toEqual({ page: 1, pageSize: 1 });
    expect(resolvePagination({ page: -4, pageSize: 500 }, limits)).toEqual({
      page: 1,
      pageSize: 50,
    });
  });

  it('uses the default for a value that is not a number, and drops a fraction', () => {
    expect(
      resolvePagination({ page: Number.NaN, pageSize: Number.POSITIVE_INFINITY }, limits),
    ).toEqual({
      page: 1,
      pageSize: 12,
    });
    expect(resolvePagination({ page: 2.9, pageSize: 10.9 }, limits)).toEqual({
      page: 2,
      pageSize: 10,
    });
  });

  it('uses each endpoint its own limits', () => {
    expect(resolvePagination({ pageSize: 100 }, PAGINATION_LIMITS.adminMessages).pageSize).toBe(
      100,
    );
    expect(resolvePagination({ pageSize: 100 }, PAGINATION_LIMITS.publicArticles).pageSize).toBe(
      50,
    );
  });
});
