import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { NotFoundError } from '#utils/application-error';
import { buildPaginationMeta } from '#utils/pagination';
import { sendCreated, sendItem, sendList, sendNoContent, sendPage } from '#utils/response';
import { API_BASE_PATH } from '../route-groups.js';
import { createPipelineApp } from '../../test/pipeline-app.js';

const SKILL = {
  id: 'e5f6a7b8c9d0e1f2a3b4c5d6',
  name: 'TypeScript',
  category: 'Languages',
  level: 'advanced',
  createdAt: '2026-10-20T09:40:00Z',
  updatedAt: '2026-10-20T09:40:00Z',
};

function createAppWithResponses() {
  return createPipelineApp({
    registerRoutes: ({ publicRoutes }) => {
      publicRoutes.get('/item', (_req, res) => void sendItem(res, SKILL));
      publicRoutes.post('/created', (_req, res) => void sendCreated(res, SKILL));
      publicRoutes.get('/page', (_req, res) => {
        sendPage(
          res,
          [{ id: 'b2c3d4e5f6a7b8c9d0e1f2a3' }],
          buildPaginationMeta({ page: 1, pageSize: 20, totalItems: 37 }),
        );
      });
      publicRoutes.get('/empty-page', (_req, res) => {
        sendPage(res, [], buildPaginationMeta({ page: 1, pageSize: 12, totalItems: 0 }));
      });
      publicRoutes.get('/list', (_req, res) => void sendList(res, [{ category: 'Tools' }], 3));
      publicRoutes.get('/empty-list', (_req, res) => void sendList(res, [], 0));
      publicRoutes.delete('/removed', (_req, res) => void sendNoContent(res));
      publicRoutes.get('/failure', () => {
        throw new NotFoundError();
      });
    },
  }).app;
}

describe('Item', () => {
  it('is { data } with the status 200', async () => {
    const response = await request(createAppWithResponses()).get(`${API_BASE_PATH}/item`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ data: SKILL });
    expect(Object.keys(response.body)).toEqual(['data']);
  });

  it('is the same shape with the status 201 when created', async () => {
    const response = await request(createAppWithResponses()).post(`${API_BASE_PATH}/created`);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: SKILL });
  });

  it('sends the object it is given, without changing it', async () => {
    const response = await request(createAppWithResponses()).get(`${API_BASE_PATH}/item`);

    expect(response.body.data).toEqual(SKILL);
  });
});

describe('Collection', () => {
  it('has meta.pagination for a paginated list', async () => {
    const response = await request(createAppWithResponses()).get(`${API_BASE_PATH}/page`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{ id: 'b2c3d4e5f6a7b8c9d0e1f2a3' }],
      meta: { pagination: { page: 1, pageSize: 20, totalItems: 37, totalPages: 2 } },
    });
  });

  it('is an empty list, with totalPages 0, when there is nothing', async () => {
    const response = await request(createAppWithResponses()).get(`${API_BASE_PATH}/empty-page`);

    expect(response.body).toEqual({
      data: [],
      meta: { pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 } },
    });
  });

  it('has meta.totalItems for a list that is always returned in full', async () => {
    const response = await request(createAppWithResponses()).get(`${API_BASE_PATH}/list`);

    expect(response.body).toEqual({ data: [{ category: 'Tools' }], meta: { totalItems: 3 } });
  });

  it('reports the total it is given, which counts records and not entries', async () => {
    const response = await request(createAppWithResponses()).get(`${API_BASE_PATH}/list`);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.totalItems).toBe(3);
  });

  it('keeps an empty list as [] and never null', async () => {
    const response = await request(createAppWithResponses()).get(`${API_BASE_PATH}/empty-list`);

    expect(response.body).toEqual({ data: [], meta: { totalItems: 0 } });
  });
});

describe('No content', () => {
  it('is 204 with no body and no content type', async () => {
    const response = await request(createAppWithResponses()).delete(`${API_BASE_PATH}/removed`);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(response.body).toEqual({});
    expect(response.headers).not.toHaveProperty('content-type');
  });
});

describe('success and failure', () => {
  it('are never both: a success has data and no error, a failure has an error and no data', async () => {
    const app = createAppWithResponses();

    const success = await request(app).get(`${API_BASE_PATH}/item`);
    const failure = await request(app).get(`${API_BASE_PATH}/failure`);

    expect(success.body).toHaveProperty('data');
    expect(success.body).not.toHaveProperty('error');
    expect(failure.body).toHaveProperty('error');
    expect(failure.body).not.toHaveProperty('data');
  });
});
