import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getValidated, validateRequest } from '#middleware/validate-request';
import {
  buildPaginationMeta,
  paginationQuery,
  paginationQuerySchema,
  type PageLimits,
} from '#utils/pagination';
import { sendItem, sendPage } from '#utils/response';
import { API_BASE_PATH } from '../route-groups.js';
import { createPipelineApp } from '../../test/pipeline-app.js';

const schemas = {
  params: z.strictObject({ id: z.string().regex(/^[0-9a-f]{24}$/) }),
  query: z.strictObject({
    ...paginationQuery({ defaultPageSize: 20, maxPageSize: 100 }),
    status: z.enum(['new', 'read']).optional(),
  }),
  body: z.strictObject({
    title: z.string().trim().min(1).max(20),
    technologies: z.array(z.string().max(5)).max(2).optional(),
  }),
};

const ID = 'e5f6a7b8c9d0e1f2a3b4c5d6';

function createAppWithValidatedRoute() {
  const reached: string[] = [];
  const result = createPipelineApp({
    registerRoutes: ({ publicRoutes }) => {
      publicRoutes.post('/items/:id', validateRequest(schemas), (_req, res) => {
        reached.push('controller');
        sendItem(res, getValidated<typeof schemas>(res));
      });
      publicRoutes.get('/items/:id', validateRequest({ params: schemas.params }), (_req, res) => {
        reached.push('controller');
        sendItem(res, getValidated<{ params: typeof schemas.params }>(res));
      });
      publicRoutes.get('/unvalidated', (_req, res) => {
        sendItem(res, getValidated<typeof schemas>(res));
      });
    },
  });
  return { ...result, reached };
}

describe('validateRequest', () => {
  it('gives the controller the parsed path, query, and body', async () => {
    const { app } = createAppWithValidatedRoute();

    const response = await request(app)
      .post(`${API_BASE_PATH}/items/${ID}?page=2&status=read`)
      .send({ title: '  A title  ' })
      .expect(200);

    expect(response.body.data).toEqual({
      params: { id: ID },
      query: { page: 2, pageSize: 20, status: 'read' },
      body: { title: 'A title' },
    });
  });

  it('uses the defaults of the schema for what the request left out', async () => {
    const { app } = createAppWithValidatedRoute();

    const response = await request(app)
      .post(`${API_BASE_PATH}/items/${ID}`)
      .send({ title: 'x' })
      .expect(200);

    expect(response.body.data.query).toEqual({ page: 1, pageSize: 20 });
  });

  it('checks only the parts that have a schema', async () => {
    const { app } = createAppWithValidatedRoute();

    const response = await request(app)
      .get(`${API_BASE_PATH}/items/${ID}?anything=goes`)
      .expect(200);

    expect(response.body.data).toEqual({ params: { id: ID } });
  });

  describe('path values', () => {
    it('answers 404 NOT_FOUND for a value that cannot identify a record', async () => {
      const { app, reached } = createAppWithValidatedRoute();

      const response = await request(app).get(`${API_BASE_PATH}/items/not-an-id`);

      expect(response.status).toBe(404);
      expect(response.body.error).toEqual({
        code: 'NOT_FOUND',
        message: 'We could not find what you were looking for.',
        requestId: expect.stringMatching(/^req_/),
      });
      expect(reached).toEqual([]);
    });

    it('answers exactly as for an address that does not exist', async () => {
      const { app } = createAppWithValidatedRoute();

      const invalid = await request(app).get(`${API_BASE_PATH}/items/not-an-id`);
      const missing = await request(app).get(`${API_BASE_PATH}/nothing-here`);

      const withoutId = ({ body }: { body: { error: Record<string, unknown> } }) => ({
        ...body.error,
        requestId: undefined,
      });
      expect(withoutId(invalid)).toEqual(withoutId(missing));
    });
  });

  describe('query', () => {
    it('answers 422 INVALID_QUERY_PARAMETER with a detail for each parameter', async () => {
      const { app, reached } = createAppWithValidatedRoute();

      const response = await request(app)
        .post(`${API_BASE_PATH}/items/${ID}?page=0&pageSize=500&status=gone&sort=name`)
        .send({ title: 'x' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INVALID_QUERY_PARAMETER');
      expect(response.body.error.details).toEqual([
        {
          field: 'page',
          code: 'NOT_ALLOWED_VALUE',
          message: 'Page must be a whole number of 1 or more.',
        },
        {
          field: 'pageSize',
          code: 'NOT_ALLOWED_VALUE',
          message: 'Page size must be a whole number from 1 to 100.',
        },
        {
          field: 'status',
          code: 'NOT_ALLOWED_VALUE',
          message: 'Status has a value that is not allowed.',
        },
        { field: 'sort', code: 'UNKNOWN_FIELD', message: 'Sort is not accepted here.' },
      ]);
      expect(reached).toEqual([]);
    });

    it('never ignores an unknown parameter', async () => {
      const { app } = createAppWithValidatedRoute();

      const response = await request(app)
        .post(`${API_BASE_PATH}/items/${ID}?q=search`)
        .send({ title: 'x' })
        .expect(422);

      expect(response.body.error.details).toEqual([
        { field: 'q', code: 'UNKNOWN_FIELD', message: 'Q is not accepted here.' },
      ]);
    });

    it('treats a repeated parameter as invalid', async () => {
      const { app } = createAppWithValidatedRoute();

      const response = await request(app)
        .post(`${API_BASE_PATH}/items/${ID}?page=1&page=2`)
        .send({ title: 'x' })
        .expect(422);

      expect(response.body.error.details[0]).toMatchObject({
        field: 'page',
        code: 'INVALID_FORMAT',
      });
    });
  });

  describe('body', () => {
    it('answers 422 VALIDATION_FAILED with a detail for every problem at once', async () => {
      const { app, reached } = createAppWithValidatedRoute();

      const response = await request(app)
        .post(`${API_BASE_PATH}/items/${ID}`)
        .send({ technologies: ['a', 'b', 'c'], id: ID, nickname: 'x' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.message).toBe('Please correct the highlighted fields.');
      expect(response.body.error.details).toEqual([
        { field: 'title', code: 'REQUIRED', message: 'Title is required.' },
        {
          field: 'technologies',
          code: 'LIST_TOO_LONG',
          message: 'Technologies can have at most 2 items.',
        },
        { field: 'id', code: 'READ_ONLY', message: 'Id cannot be set.' },
        { field: 'nickname', code: 'UNKNOWN_FIELD', message: 'Nickname is not accepted here.' },
      ]);
      expect(reached).toEqual([]);
    });

    it('reports each required field when the request has no body', async () => {
      const { app } = createAppWithValidatedRoute();

      const response = await request(app).post(`${API_BASE_PATH}/items/${ID}`).expect(422);

      expect(response.body.error.details).toEqual([
        { field: 'title', code: 'REQUIRED', message: 'Title is required.' },
      ]);
    });

    it('rejects a body that is not an object', async () => {
      const { app } = createAppWithValidatedRoute();

      const response = await request(app)
        .post(`${API_BASE_PATH}/items/${ID}`)
        .set('Content-Type', 'application/json')
        .send('[1,2]')
        .expect(422);

      expect(response.body.error.details).toEqual([
        { field: 'body', code: 'INVALID_FORMAT', message: 'This value is not valid.' },
      ]);
    });

    it('changes nothing and runs nothing when the request is rejected', async () => {
      const { app, reached } = createAppWithValidatedRoute();

      await request(app).post(`${API_BASE_PATH}/items/${ID}`).send({ title: '' }).expect(422);

      expect(reached).toEqual([]);
    });
  });

  describe('order', () => {
    it('checks the path first, then the query, then the body', async () => {
      const { app } = createAppWithValidatedRoute();

      const allBad = await request(app).post(`${API_BASE_PATH}/items/x?page=0`).send({});
      const queryAndBodyBad = await request(app)
        .post(`${API_BASE_PATH}/items/${ID}?page=0`)
        .send({});

      expect(allBad.body.error.code).toBe('NOT_FOUND');
      expect(queryAndBodyBad.body.error.code).toBe('INVALID_QUERY_PARAMETER');
    });
  });

  describe('getValidated', () => {
    it('fails with a generic 500 on a route that did not attach validateRequest', async () => {
      const { app, entries } = createAppWithValidatedRoute();

      const response = await request(app).get(`${API_BASE_PATH}/unvalidated`);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.text).not.toContain('validateRequest');
      expect(entries.find((entry) => entry.event === 'unexpected_error')?.error).toMatchObject({
        message: 'validateRequest was not attached to this route.',
      });
    });
  });
});

describe('a paginated endpoint, from request to response', () => {
  const records = ['a', 'b', 'c'];
  const limits: PageLimits = { defaultPageSize: 2, maxPageSize: 5 };
  const schemas = { query: paginationQuerySchema(limits) };

  function createAppWithPagedList() {
    return createPipelineApp({
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.get('/records', validateRequest(schemas), (_req, res) => {
          const { query } = getValidated<typeof schemas>(res);
          const start = (query.page - 1) * query.pageSize;
          sendPage(
            res,
            records.slice(start, start + query.pageSize),
            buildPaginationMeta({ ...query, totalItems: records.length }),
          );
        });
      },
    }).app;
  }

  it('serves the first page with the default size', async () => {
    const response = await request(createAppWithPagedList())
      .get(`${API_BASE_PATH}/records`)
      .expect(200);

    expect(response.body).toEqual({
      data: ['a', 'b'],
      meta: { pagination: { page: 1, pageSize: 2, totalItems: 3, totalPages: 2 } },
    });
  });

  it('serves a later page', async () => {
    const response = await request(createAppWithPagedList())
      .get(`${API_BASE_PATH}/records?page=2`)
      .expect(200);

    expect(response.body.data).toEqual(['c']);
  });

  it('answers 200 with an empty list, not an error, for a page beyond the last', async () => {
    const response = await request(createAppWithPagedList())
      .get(`${API_BASE_PATH}/records?page=9`)
      .expect(200);

    expect(response.body).toEqual({
      data: [],
      meta: { pagination: { page: 9, pageSize: 2, totalItems: 3, totalPages: 2 } },
    });
  });

  it.each(['page=0', 'pageSize=6', 'page=abc', 'sort=name'])(
    'answers 422 for ?%s',
    async (query) => {
      const response = await request(createAppWithPagedList()).get(
        `${API_BASE_PATH}/records?${query}`,
      );

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INVALID_QUERY_PARAMETER');
    },
  );
});
