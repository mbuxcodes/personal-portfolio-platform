import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { API_BASE_PATH } from '../route-groups.js';
import { createPipelineApp } from '../../test/pipeline-app.js';
import { sendRaw } from '../../test/raw-request.js';
import { requestWith, type WriteMethod } from '../../test/write-request.js';

const ECHO = `${API_BASE_PATH}/echo`;
const JSON_LIMIT = 100;
const MULTIPART_LIMIT = 200;
const MULTIPART = 'multipart/form-data; boundary=test';
const WRITE_METHODS: readonly WriteMethod[] = ['post', 'put', 'patch', 'delete'];

function createAppWithEchoRoutes() {
  const reached: string[] = [];
  const { app, ...rest } = createPipelineApp({
    config: { bodyLimits: { jsonBytes: JSON_LIMIT, multipartBytes: MULTIPART_LIMIT } },
    registerRoutes: ({ publicRoutes }) => {
      publicRoutes.all('/echo', (req, res) => {
        reached.push(req.method);
        res.json({ body: req.body ?? null });
      });
    },
  });
  return { app, reached, ...rest };
}

const jsonOf = (size: number): string => JSON.stringify({ value: 'x'.repeat(size) });

describe('JSON bodies', () => {
  it('parses a JSON body within the limit, for every method that changes data', async () => {
    const { app } = createAppWithEchoRoutes();

    for (const method of WRITE_METHODS) {
      const response = await requestWith(app, method, ECHO).send({ title: 'hello' }).expect(200);
      expect(response.body).toEqual({ body: { title: 'hello' } });
    }
  });

  it('accepts the content type in any case, with parameters', async () => {
    const { app } = createAppWithEchoRoutes();

    const response = await request(app)
      .post(ECHO)
      .set('Content-Type', 'Application/JSON; charset=utf-8')
      .send('{"a":1}')
      .expect(200);

    expect(response.body).toEqual({ body: { a: 1 } });
  });

  it('refuses a declared length over the limit with 413 REQUEST_TOO_LARGE, without running the route', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    const response = await request(app)
      .post(ECHO)
      .set('Content-Type', 'application/json')
      .send(jsonOf(JSON_LIMIT));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('REQUEST_TOO_LARGE');
    expect(response.body.error.requestId).toMatch(/^req_/);
    expect(response.headers.connection).toBe('close');
    expect(reached).toEqual([]);
  });

  it('accepts a body of exactly the limit', async () => {
    const { app } = createAppWithEchoRoutes();
    const overhead = jsonOf(0).length;

    await request(app)
      .post(ECHO)
      .set('Content-Type', 'application/json')
      .send(jsonOf(JSON_LIMIT - overhead))
      .expect(200);
  });

  it('limits a body that declares no length while it is read', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    const response = await sendRaw(app, {
      method: 'POST',
      path: ECHO,
      headers: { 'Content-Type': 'application/json' },
      chunks: ['{"value":"', 'x'.repeat(JSON_LIMIT), '"}'],
    });

    expect(response.status).toBe(413);
    expect(response.json()).toMatchObject({ error: { code: 'REQUEST_TOO_LARGE' } });
    expect(reached).toEqual([]);
  });

  it('does not turn other body errors into a size error', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    const response = await request(app)
      .post(ECHO)
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body?.error?.code).not.toBe('REQUEST_TOO_LARGE');
    expect(reached).toEqual([]);
  });
});

describe('multipart bodies', () => {
  it('lets a multipart request within the limit through, unread', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    const response = await request(app)
      .post(ECHO)
      .set('Content-Type', MULTIPART)
      .send(Buffer.alloc(MULTIPART_LIMIT, 'a'))
      .expect(200);

    expect(response.body).toEqual({ body: null });
    expect(reached).toEqual(['POST']);
  });

  it('refuses a declared length over the multipart limit with 413 REQUEST_TOO_LARGE', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    const response = await request(app)
      .post(ECHO)
      .set('Content-Type', MULTIPART)
      .send(Buffer.alloc(MULTIPART_LIMIT + 1, 'a'));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('REQUEST_TOO_LARGE');
    expect(reached).toEqual([]);
  });

  it('uses the multipart limit for multipart and the JSON limit for JSON', async () => {
    const { app } = createAppWithEchoRoutes();
    const size = JSON_LIMIT + 50;

    await request(app)
      .post(ECHO)
      .set('Content-Type', MULTIPART)
      .send(Buffer.alloc(size))
      .expect(200);
    await request(app)
      .post(ECHO)
      .set('Content-Type', 'application/json')
      .send(jsonOf(size))
      .expect(413);
  });

  it('refuses a multipart request that declares no length, because it could not be limited', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    const response = await sendRaw(app, {
      method: 'POST',
      path: ECHO,
      headers: { 'Content-Type': MULTIPART },
      chunks: ['part one', 'part two'],
    });

    expect(response.status).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'MALFORMED_REQUEST' } });
    expect(reached).toEqual([]);
  });
});

describe('content type', () => {
  it.each(WRITE_METHODS)(
    'refuses a %s with a body of another type with 415 UNSUPPORTED_CONTENT_TYPE',
    async (method) => {
      const { app, reached } = createAppWithEchoRoutes();

      const response = await requestWith(app, method, ECHO)
        .set('Content-Type', 'text/plain')
        .send('hi');

      expect(response.status).toBe(415);
      expect(response.body.error.code).toBe('UNSUPPORTED_CONTENT_TYPE');
      expect(response.body.error.requestId).toMatch(/^req_/);
      expect(reached).toEqual([]);
    },
  );

  it.each(['application/x-www-form-urlencoded', 'application/xml', 'application/octet-stream'])(
    'refuses %s',
    async (contentType) => {
      const { app } = createAppWithEchoRoutes();

      await request(app).post(ECHO).set('Content-Type', contentType).send('a=1').expect(415);
    },
  );

  it('refuses a body with no content type', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    const response = await sendRaw(app, { method: 'POST', path: ECHO, chunks: ['{"a":1}'] });

    expect(response.status).toBe(415);
    expect(reached).toEqual([]);
  });

  it('refuses the empty form that a page on another site can send', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    await request(app)
      .post(ECHO)
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .expect(415);

    expect(reached).toEqual([]);
  });

  it('allows a request that changes data and has neither a body nor a content type', async () => {
    const { app, reached } = createAppWithEchoRoutes();

    await request(app).post(ECHO).expect(200, { body: null });
    await request(app).delete(ECHO).expect(200);

    expect(reached).toEqual(['POST', 'DELETE']);
  });

  it('does not apply the rule to reads', async () => {
    const { app } = createAppWithEchoRoutes();

    await request(app).get(ECHO).set('Content-Type', 'text/plain').expect(200);
  });
});
