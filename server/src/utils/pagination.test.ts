import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApplicationError } from '#utils/application-error';
import {
  buildPaginationMeta,
  paginationQuery,
  paginationQuerySchema,
  type PageLimits,
} from '#utils/pagination';
import { validateInput } from '#utils/validation';

// The defaults and maxima of API_DESIGN.md Section 9.1.
const PROJECTS: PageLimits = { defaultPageSize: 12, maxPageSize: 50 };
const ARTICLES: PageLimits = { defaultPageSize: 10, maxPageSize: 50 };
const ADMIN: PageLimits = { defaultPageSize: 20, maxPageSize: 100 };

const parse = (limits: PageLimits, query: unknown) =>
  validateInput('query', paginationQuerySchema(limits), query);

function failure(limits: PageLimits, query: unknown) {
  try {
    parse(limits, query);
  } catch (error) {
    if (error instanceof ApplicationError) return error;
    throw error;
  }
  throw new Error('Expected the query to be rejected.');
}

describe('defaults and maxima for each endpoint', () => {
  it.each([
    ['GET /projects', PROJECTS, { page: 1, pageSize: 12 }],
    ['GET /articles', ARTICLES, { page: 1, pageSize: 10 }],
    ['GET /admin/projects, /admin/articles, /admin/messages', ADMIN, { page: 1, pageSize: 20 }],
  ] as const)('%s defaults to %j', (_endpoint, limits, expected) => {
    expect(parse(limits, {})).toEqual(expected);
  });

  it.each([
    [PROJECTS, '50', true],
    [PROJECTS, '51', false],
    [ARTICLES, '50', true],
    [ARTICLES, '51', false],
    [ADMIN, '100', true],
    [ADMIN, '101', false],
  ] as const)('with a maximum of %j, pageSize=%s is accepted: %s', (limits, pageSize, accepted) => {
    if (accepted) expect(parse(limits, { pageSize }).pageSize).toBe(Number(pageSize));
    else expect(failure(limits, { pageSize }).code).toBe('INVALID_QUERY_PARAMETER');
  });

  it('accepts the smallest values and large pages', () => {
    expect(parse(PROJECTS, { page: '1', pageSize: '1' })).toEqual({ page: 1, pageSize: 1 });
    expect(parse(PROJECTS, { page: '5000' })).toEqual({ page: 5000, pageSize: 12 });
  });

  it('returns numbers, not text', () => {
    const result = parse(PROJECTS, { page: '3', pageSize: '7' });

    expect(typeof result.page).toBe('number');
    expect(typeof result.pageSize).toBe('number');
  });
});

describe('values that are not valid', () => {
  it.each([
    ['0', 'NOT_ALLOWED_VALUE'],
    ['-1', 'INVALID_FORMAT'],
    ['abc', 'INVALID_FORMAT'],
    ['1.5', 'INVALID_FORMAT'],
    ['1e3', 'INVALID_FORMAT'],
    ['0x10', 'INVALID_FORMAT'],
    [' 2', 'INVALID_FORMAT'],
    ['', 'INVALID_FORMAT'],
  ])('page=%j is INVALID_QUERY_PARAMETER with %s at page', (page, code) => {
    const error = failure(PROJECTS, { page });

    expect(error.status).toBe(422);
    expect(error.code).toBe('INVALID_QUERY_PARAMETER');
    expect(error.details).toEqual([{ field: 'page', code, message: expect.any(String) }]);
  });

  it.each([
    ['0', 'NOT_ALLOWED_VALUE'],
    ['51', 'NOT_ALLOWED_VALUE'],
    ['-5', 'INVALID_FORMAT'],
    ['many', 'INVALID_FORMAT'],
    ['', 'INVALID_FORMAT'],
  ])('pageSize=%j is INVALID_QUERY_PARAMETER with %s at pageSize', (pageSize, code) => {
    const error = failure(PROJECTS, { pageSize });

    expect(error.code).toBe('INVALID_QUERY_PARAMETER');
    expect(error.details).toEqual([
      { field: 'pageSize', code, message: 'Page size must be a whole number from 1 to 50.' },
    ]);
  });

  it('names the endpoint’s own maximum in the message', () => {
    expect(failure(ADMIN, { pageSize: '0' }).details?.[0]?.message).toBe(
      'Page size must be a whole number from 1 to 100.',
    );
  });

  it('reports both parameters when both are wrong', () => {
    const error = failure(PROJECTS, { page: '0', pageSize: 'x' });

    expect(error.details?.map(({ field }) => field)).toEqual(['page', 'pageSize']);
  });

  it('rejects a repeated parameter', () => {
    expect(failure(PROJECTS, { page: ['1', '2'] }).details?.[0]).toMatchObject({
      field: 'page',
      code: 'INVALID_FORMAT',
    });
  });

  it('rejects a number that is larger than can be counted exactly', () => {
    expect(failure(PROJECTS, { page: '99999999999999999999' }).code).toBe(
      'INVALID_QUERY_PARAMETER',
    );
  });

  it('rejects an unknown parameter, and the reserved names, rather than ignoring them', () => {
    for (const name of ['sort', 'q', 'category', 'from', 'to', 'limit', 'offset']) {
      expect(failure(PROJECTS, { [name]: 'x' }).details).toEqual([
        { field: name, code: 'UNKNOWN_FIELD', message: expect.any(String) },
      ]);
    }
  });
});

describe('composition with an endpoint’s own filters', () => {
  const projectsQuery = z.strictObject({
    ...paginationQuery(PROJECTS),
    featured: z.enum(['true']).optional(),
  });

  it('accepts the filter beside the pagination', () => {
    expect(validateInput('query', projectsQuery, { featured: 'true', page: '2' })).toEqual({
      page: 2,
      pageSize: 12,
      featured: 'true',
    });
  });

  it('rejects a filter value that is not supported', () => {
    try {
      validateInput('query', projectsQuery, { featured: 'false' });
      expect.unreachable();
    } catch (error) {
      expect((error as ApplicationError).details).toEqual([
        { field: 'featured', code: 'NOT_ALLOWED_VALUE', message: expect.any(String) },
      ]);
    }
  });
});

describe('pagination metadata', () => {
  it.each([
    [{ page: 1, pageSize: 20, totalItems: 37 }, 2],
    [{ page: 2, pageSize: 20, totalItems: 37 }, 2],
    [{ page: 1, pageSize: 20, totalItems: 40 }, 2],
    [{ page: 1, pageSize: 20, totalItems: 41 }, 3],
    [{ page: 1, pageSize: 12, totalItems: 1 }, 1],
    [{ page: 1, pageSize: 12, totalItems: 0 }, 0],
    [{ page: 4, pageSize: 10, totalItems: 3 }, 1],
  ] as const)('%j has %i total pages', (input, totalPages) => {
    expect(buildPaginationMeta(input)).toEqual({ ...input, totalPages });
  });

  it('has exactly the four fields of API_DESIGN.md Section 9.3', () => {
    expect(
      Object.keys(buildPaginationMeta({ page: 1, pageSize: 20, totalItems: 37 })).sort(),
    ).toEqual(['page', 'pageSize', 'totalItems', 'totalPages']);
  });
});
