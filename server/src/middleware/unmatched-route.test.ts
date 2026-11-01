import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ADMIN_GROUP_PATH, API_BASE_PATH, AUTH_GROUP_PATH } from '../route-groups.js';
import { createPipelineApp } from '../../test/pipeline-app.js';
import { requestWith } from '../../test/write-request.js';

const ok = (_req: unknown, res: { send: (body: string) => void }) => void res.send('ok');

/** The methods of an Allow header, whatever spacing the sender used after the commas. */
const methodsOf = (header: string | undefined): string[] =>
  (header ?? '')
    .split(',')
    .map((method) => method.trim())
    .filter((method) => method !== '')
    .sort();

function createAppWithRoutes() {
  return createPipelineApp({
    registerRoutes: ({ authRoutes, adminRoutes, publicRoutes }) => {
      publicRoutes.get('/items', ok);
      publicRoutes.route('/things').get(ok).post(ok);
      publicRoutes.patch('/items/:id', ok);
      publicRoutes.post('/post-only', ok);
      publicRoutes.get('/passes-on', (_req, _res, next) => next());
      adminRoutes.put('/settings', ok);
      authRoutes.post('/login', ok);

      const child = Router();
      child.get('/leaf', ok);
      const grandchild = Router();
      grandchild.delete('/deepest', ok);
      child.use('/more', grandchild);
      publicRoutes.use('/nested', child);
    },
  }).app;
}

describe('404 for an address that nothing handles', () => {
  it.each([
    [API_BASE_PATH, '/api/v1'],
    ['/api/v1/missing', 'unknown path in the public group'],
    [`${ADMIN_GROUP_PATH}/missing`, 'unknown path in the admin group'],
    [`${AUTH_GROUP_PATH}/missing`, 'unknown path in the auth group'],
    ['/', 'the site root'],
    ['/robots.txt', 'a path outside the API'],
    ['/api/v1/nested/missing', 'unknown path inside a nested router'],
    ['/api/v1/items/extra/segments', 'a longer path than a route'],
  ])('%s (%s)', async (path) => {
    const response = await request(createAppWithRoutes()).get(path);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.headers).not.toHaveProperty('allow');
  });

  it('answers the same for every method when no route has the address', async () => {
    const app = createAppWithRoutes();

    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const response = await requestWith(app, method, '/api/v1/missing');
      expect(response.status).toBe(404);
    }
  });
});

describe('405 for an address that exists for other methods', () => {
  it.each([
    ['post', '/api/v1/items', 'GET, HEAD'],
    ['delete', '/api/v1/items', 'GET, HEAD'],
    ['put', '/api/v1/things', 'GET, HEAD, POST'],
    ['delete', '/api/v1/things', 'GET, HEAD, POST'],
    ['get', '/api/v1/items/5', 'PATCH'],
    ['delete', '/api/v1/items/5', 'PATCH'],
    ['get', '/api/v1/post-only', 'POST'],
    ['get', '/api/v1/admin/settings', 'PUT'],
    ['post', '/api/v1/admin/settings', 'PUT'],
    ['get', '/api/v1/auth/login', 'POST'],
    ['post', '/api/v1/nested/leaf', 'GET, HEAD'],
    ['get', '/api/v1/nested/more/deepest', 'DELETE'],
  ] as const)('%s %s lists %s', async (method, path, allow) => {
    const response = await requestWith(createAppWithRoutes(), method, path);

    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe(allow);
    expect(response.body.error).toEqual({
      code: 'METHOD_NOT_ALLOWED',
      message: 'This action is not available here.',
      requestId: expect.stringMatching(/^req_/),
    });
  });

  it('finds the address however it is written, as routing does', async () => {
    const app = createAppWithRoutes();

    for (const path of ['/api/v1/items/', '/API/V1/ITEMS', '/api/v1/Items']) {
      const response = await request(app).post(path);
      expect(response.status).toBe(405);
      expect(response.headers.allow).toBe('GET, HEAD');
    }
  });

  it('treats HEAD as GET', async () => {
    const app = createAppWithRoutes();

    await request(app).head('/api/v1/items').expect(200);
    const response = await request(app).head('/api/v1/post-only');

    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('POST');
  });

  it('is a 404, not a 405, when a route accepts the method but passed the request on', async () => {
    const response = await request(createAppWithRoutes()).get('/api/v1/passes-on');

    expect(response.status).toBe(404);
  });

  it('is logged at info as a failure of the request', async () => {
    const { app, entries } = createPipelineApp({
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.get('/items', ok);
      },
    });

    await request(app).post('/api/v1/items');

    expect(entries.find((entry) => entry.event === 'request_failed')).toMatchObject({
      level: 'info',
      code: 'METHOD_NOT_ALLOWED',
      status: 405,
    });
  });
});

describe('OPTIONS', () => {
  it('is answered by Express for an address that exists, and is a 404 for one that does not', async () => {
    const app = createAppWithRoutes();

    const known = await request(app).options('/api/v1/things');
    const unknown = await request(app).options('/api/v1/missing');

    expect(known.status).toBe(200);
    // Express writes this header itself, so only the methods are compared, not the spacing.
    expect(methodsOf(known.headers.allow)).toEqual(['GET', 'HEAD', 'POST']);
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('NOT_FOUND');
  });
});
