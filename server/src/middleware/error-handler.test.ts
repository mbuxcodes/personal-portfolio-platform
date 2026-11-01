import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  InternalError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  ValidationFailedError,
} from '#utils/application-error';
import { API_BASE_PATH } from '../route-groups.js';
import { ERROR_CASES, SAMPLE_DETAILS } from '../../test/error-cases.js';
import { createPipelineApp } from '../../test/pipeline-app.js';

const GENERIC_MESSAGE = 'Something went wrong on our side. Please try again.';

function createAppThatFails() {
  return createPipelineApp({
    registerRoutes: ({ publicRoutes }) => {
      const byCode = (code: unknown) => {
        const found = ERROR_CASES.find((candidate) => candidate.code === code);
        if (found === undefined) throw new Error(`Unknown test case ${String(code)}`);
        return found.create();
      };

      publicRoutes.get('/fail/:code', (req) => {
        throw byCode(req.params.code);
      });
      publicRoutes.get('/fail-async/:code', async (req) => {
        await Promise.resolve();
        throw byCode(req.params.code);
      });
      publicRoutes.get('/fail-typed', () => {
        throw new ValidationFailedError(SAMPLE_DETAILS);
      });
      publicRoutes.get('/boom-type-error', () => {
        throw new TypeError('db password=hunter2 failed at /srv/app/service.ts:12:3');
      });
      publicRoutes.get('/boom-string', () => {
        throw 'plain text with secret-token-abc';
      });
      publicRoutes.get('/boom-object', () => {
        throw { reason: 'secret-token-abc' };
      });
      publicRoutes.get('/boom-async', async () => {
        await Promise.resolve();
        throw new Error('async failure with secret-token-abc');
      });
      publicRoutes.get('/boom-rejected', () =>
        Promise.reject(new Error('rejected with secret-token-abc')),
      );
      publicRoutes.get('/boom-rejected-text', () =>
        Promise.reject('rejected text secret-token-abc'),
      );
      publicRoutes.get('/unavailable', () => {
        throw new ServiceUnavailableError({
          cause: new Error('connect ECONNREFUSED db.internal:27017'),
        });
      });
      publicRoutes.get('/too-many', () => {
        throw new TooManyRequestsError(12);
      });
      publicRoutes.get('/not-found', () => {
        throw new NotFoundError();
      });
      publicRoutes.get('/internal', () => {
        throw new InternalError({ cause: new Error('the real cause') });
      });
      publicRoutes.get('/partial', (_req, res) => {
        res.status(200).write('{"data":');
        throw new Error('failed after the response began');
      });
      publicRoutes.post('/echo', (req, res) => void res.json({ body: req.body }));
    },
  });
}

describe('every application error through the real application', () => {
  it.each(ERROR_CASES)(
    '$code leaves as $status in the standard shape',
    async ({ status, code, create }) => {
      const { app } = createAppThatFails();
      const expected = create();

      const response = await request(app).get(`${API_BASE_PATH}/fail/${code}`);

      expect(response.status).toBe(status);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body.error).toMatchObject({
        code,
        message: expected.message,
        requestId: expect.stringMatching(/^req_[0-9a-f]+$/),
      });
      expect(response.body).not.toHaveProperty('data');
      expect(Object.keys(response.body)).toEqual(['error']);
    },
  );

  it.each(ERROR_CASES)(
    '$code leaves the same way from asynchronous code',
    async ({ status, code }) => {
      const { app } = createAppThatFails();

      const response = await request(app).get(`${API_BASE_PATH}/fail-async/${code}`);

      expect(response.status).toBe(status);
      expect(response.body.error.code).toBe(code);
      expect(response.body.error.requestId).toMatch(/^req_/);
    },
  );

  it('sends the details of a validation failure, and only then', async () => {
    const { app } = createAppThatFails();

    const withDetails = await request(app).get(`${API_BASE_PATH}/fail/VALIDATION_FAILED`);
    const without = await request(app).get(`${API_BASE_PATH}/fail/NOT_FOUND`);

    expect(withDetails.body.error.details).toEqual(SAMPLE_DETAILS);
    expect(without.body.error).not.toHaveProperty('details');
  });

  it('sends the headers that go with an error', async () => {
    const { app } = createAppThatFails();

    const tooMany = await request(app).get(`${API_BASE_PATH}/fail/TOO_MANY_REQUESTS`);
    const blocked = await request(app).get(`${API_BASE_PATH}/fail/SIGN_IN_TEMPORARILY_BLOCKED`);
    const notAllowed = await request(app).get(`${API_BASE_PATH}/fail/METHOD_NOT_ALLOWED`);

    expect(tooMany.headers['retry-after']).toBe('30');
    expect(tooMany.body.error).not.toHaveProperty('retryAfterSeconds');
    expect(blocked.headers['retry-after']).toBe('900');
    expect(blocked.body.error.retryAfterSeconds).toBe(900);
    expect(notAllowed.headers.allow).toBe('GET, HEAD');
  });

  it('keeps the security headers on an error response', async () => {
    const { app } = createAppThatFails();

    const response = await request(app).get(`${API_BASE_PATH}/fail/NOT_FOUND`);

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
});

describe('unexpected failures', () => {
  const unexpected = [
    ['a thrown TypeError', 'boom-type-error', 'TypeError'],
    ['a thrown string', 'boom-string', 'NonError'],
    ['a thrown object', 'boom-object', 'NonError'],
    ['an asynchronous throw (Express 5 forwards it)', 'boom-async', 'Error'],
    ['a rejected promise returned from a handler', 'boom-rejected', 'Error'],
    ['a promise rejected with a string', 'boom-rejected-text', 'NonError'],
  ] as const;

  it.each(unexpected)('%s becomes a generic 500 INTERNAL_ERROR', async (_name, path) => {
    const { app } = createAppThatFails();

    const response = await request(app).get(`${API_BASE_PATH}/${path}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: GENERIC_MESSAGE,
        requestId: expect.stringMatching(/^req_[0-9a-f]+$/),
      },
    });
  });

  it.each(unexpected)('%s never reaches the client in any form', async (_name, path) => {
    const { app } = createAppThatFails();

    const response = await request(app).get(`${API_BASE_PATH}/${path}`);

    expect(response.text).not.toMatch(
      /hunter2|secret-token|service\.ts|TypeError|Error:|\bat \w|stack/i,
    );
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it.each(unexpected)(
    '%s is logged once, with the detail, at error level',
    async (_name, path, name) => {
      const { app, entries } = createAppThatFails();

      const response = await request(app).get(`${API_BASE_PATH}/${path}`);

      const logged = entries.filter((entry) => entry.event === 'unexpected_error');
      expect(logged).toHaveLength(1);
      expect(logged[0]).toMatchObject({
        level: 'error',
        requestId: response.body.error.requestId,
        error: { name, message: expect.any(String) },
      });
    },
  );

  it('logs the stack of a real error, so a developer can find the cause', async () => {
    const { app, entries } = createAppThatFails();

    await request(app).get(`${API_BASE_PATH}/boom-type-error`);

    const logged = entries.find((entry) => entry.event === 'unexpected_error');
    expect(logged?.error).toMatchObject({
      name: 'TypeError',
      message: 'db password=hunter2 failed at /srv/app/service.ts:12:3',
      stack: expect.stringContaining('TypeError'),
    });
  });

  it('still writes the completion entry, with status 500', async () => {
    const { app, entries } = createAppThatFails();

    await request(app).get(`${API_BASE_PATH}/boom-async`);

    expect(entries.at(-1)).toMatchObject({ event: 'request_completed', status: 500 });
  });

  it('keeps serving requests after a failure', async () => {
    const { app } = createAppThatFails();

    await request(app).get(`${API_BASE_PATH}/boom-async`).expect(500);
    await request(app).get(`${API_BASE_PATH}/not-found`).expect(404);
  });

  it('logs a failure after the response began, and does not send a second response', async () => {
    const { app, entries } = createAppThatFails();

    await request(app)
      .get(`${API_BASE_PATH}/partial`)
      .then(
        (response) => response,
        () => undefined,
      );

    expect(entries.some((entry) => entry.event === 'unexpected_error')).toBe(true);
  });
});

describe('logging of typed errors', () => {
  it('writes one entry with the code, status, and request identifier, at the level of the class', async () => {
    const { app, entries } = createAppThatFails();

    const response = await request(app).get(`${API_BASE_PATH}/too-many`);

    const logged = entries.filter((entry) => entry.event === 'request_failed');
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({
      level: 'warn',
      code: 'TOO_MANY_REQUESTS',
      status: 429,
      requestId: response.body.error.requestId,
    });
  });

  it('logs a not-found at info', async () => {
    const { app, entries } = createAppThatFails();

    await request(app).get(`${API_BASE_PATH}/not-found`);

    expect(entries.find((entry) => entry.event === 'request_failed')).toMatchObject({
      level: 'info',
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('logs the cause of a failure, and sends only the generic text', async () => {
    const { app, entries, output } = createAppThatFails();

    const response = await request(app).get(`${API_BASE_PATH}/unavailable`);

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(response.text).not.toMatch(/ECONNREFUSED|db\.internal/);
    expect(entries.find((entry) => entry.event === 'request_failed')).toMatchObject({
      level: 'error',
      code: 'SERVICE_UNAVAILABLE',
      cause: { message: 'connect ECONNREFUSED db.internal:27017' },
    });
    expect(output()).toContain('db.internal');
  });

  it('answers INTERNAL_ERROR raised on purpose with the generic message, and logs its cause', async () => {
    const { app, entries } = createAppThatFails();

    const response = await request(app).get(`${API_BASE_PATH}/internal`);

    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe(GENERIC_MESSAGE);
    expect(response.text).not.toContain('the real cause');
    expect(entries.find((entry) => entry.event === 'request_failed')).toMatchObject({
      level: 'error',
      code: 'INTERNAL_ERROR',
      cause: { message: 'the real cause' },
    });
  });

  it('writes no entry for a request that succeeds', async () => {
    const { app, entries } = createPipelineApp({
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.get('/fine', (_req, res) => void res.json({ data: 1 }));
      },
    });

    await request(app).get(`${API_BASE_PATH}/fine`).expect(200);

    expect(entries.map((entry) => entry.event)).toEqual(['request_completed']);
  });
});

describe('not found and method not allowed', () => {
  it('answers an address that no route handles with 404 NOT_FOUND', async () => {
    const { app } = createAppThatFails();

    const response = await request(app).get(`${API_BASE_PATH}/nothing-here`);

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: 'NOT_FOUND',
      message: 'We could not find what you were looking for.',
      requestId: expect.stringMatching(/^req_/),
    });
  });

  it('answers an address outside the API the same way', async () => {
    const { app } = createAppThatFails();

    const response = await request(app).get('/robots.txt');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('answers a method that the address does not support with 405 and an Allow header', async () => {
    const { app } = createAppThatFails();

    const response = await request(app).delete(`${API_BASE_PATH}/not-found`);

    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('GET, HEAD');
    expect(response.body.error).toEqual({
      code: 'METHOD_NOT_ALLOWED',
      message: 'This action is not available here.',
      requestId: expect.stringMatching(/^req_/),
    });
  });
});

describe('malformed JSON', () => {
  it('becomes 400 MALFORMED_REQUEST, without the parser’s own words', async () => {
    const { app } = createAppThatFails();

    const response = await request(app)
      .post(`${API_BASE_PATH}/echo`)
      .set('Content-Type', 'application/json')
      .send('{"title": "unfinished"');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'MALFORMED_REQUEST',
        message: 'The request could not be read. Please check it and try again.',
        requestId: expect.stringMatching(/^req_/),
      },
    });
    expect(response.text).not.toMatch(/Unexpected|JSON at position|unfinished/);
  });

  it.each(['{', '{"a":}', 'not json', '{"a":1,}', "{'a':1}"])('rejects %s', async (body) => {
    const { app } = createAppThatFails();

    await request(app)
      .post(`${API_BASE_PATH}/echo`)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(400)
      .expect((response) => expect(response.body.error.code).toBe('MALFORMED_REQUEST'));
  });

  it('is logged at info, as a failure of the request and not of the server', async () => {
    const { app, entries } = createAppThatFails();

    await request(app)
      .post(`${API_BASE_PATH}/echo`)
      .set('Content-Type', 'application/json')
      .send('{');

    expect(entries.find((entry) => entry.event === 'request_failed')).toMatchObject({
      level: 'info',
      code: 'MALFORMED_REQUEST',
      status: 400,
    });
    expect(entries.some((entry) => entry.event === 'unexpected_error')).toBe(false);
  });

  it('does not run the route', async () => {
    const reached: string[] = [];
    const { app } = createPipelineApp({
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.post('/echo', (_req, res) => {
          reached.push('post');
          res.json({});
        });
      },
    });

    await request(app)
      .post(`${API_BASE_PATH}/echo`)
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);

    expect(reached).toEqual([]);
  });
});

describe('the refusals of the pipeline and the typed errors agree', () => {
  // The pipeline (M2.4) refuses some requests before any route runs, and builds those responses
  // itself. Its status, code, and message must be exactly what the typed error says.
  it.each([
    ['REQUEST_TOO_LARGE', 413],
    ['UNSUPPORTED_CONTENT_TYPE', 415],
    ['MALFORMED_REQUEST', 400],
    ['TOO_MANY_REQUESTS', 429],
    ['FORBIDDEN', 403],
  ] as const)('%s', async (code, status) => {
    const { app } = createPipelineApp({
      config: {
        bodyLimits: { jsonBytes: 50, multipartBytes: 100 },
        rateLimits: {
          publicRead: { max: 1, windowSeconds: 60 },
          contact: { max: 1000, windowSeconds: 60 },
          signIn: { max: 1000, windowSeconds: 60 },
          renewal: { max: 1000, windowSeconds: 60 },
          admin: { max: 1000, windowSeconds: 60 },
          upload: { max: 1000, windowSeconds: 60 },
        },
      },
      registerRoutes: ({ adminRoutes, publicRoutes }, { crossSiteCheck }) => {
        publicRoutes.all('/probe', (_req, res) => void res.send('ok'));
        adminRoutes.use(crossSiteCheck);
        adminRoutes.post('/probe', (_req, res) => void res.send('ok'));
      },
    });
    const expected = ERROR_CASES.find((candidate) => candidate.code === code)?.create();
    const adminProbe = `${API_BASE_PATH}/admin/probe`;

    const response = await {
      REQUEST_TOO_LARGE: () =>
        request(app)
          .post(`${API_BASE_PATH}/probe`)
          .set('Content-Type', 'application/json')
          .send(JSON.stringify({ value: 'x'.repeat(100) })),
      UNSUPPORTED_CONTENT_TYPE: () =>
        request(app).post(`${API_BASE_PATH}/probe`).set('Content-Type', 'text/plain').send('x'),
      MALFORMED_REQUEST: () =>
        request(app)
          .post(`${API_BASE_PATH}/probe`)
          .set('Content-Type', 'application/json')
          .send('{'),
      TOO_MANY_REQUESTS: async () => {
        await request(app).get(`${API_BASE_PATH}/probe`);
        return request(app).get(`${API_BASE_PATH}/probe`);
      },
      FORBIDDEN: () => request(app).post(adminProbe),
    }[code]();

    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
    expect(response.body.error.message).toBe(expected?.message);
  });
});

describe('error handling in a nested router', () => {
  it('handles a failure raised in a router mounted inside a group', async () => {
    const { app } = createPipelineApp({
      registerRoutes: ({ publicRoutes }) => {
        const nested = Router();
        nested.get('/deep', async () => {
          throw new NotFoundError();
        });
        publicRoutes.use('/nested', nested);
      },
    });

    const response = await request(app).get(`${API_BASE_PATH}/nested/deep`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
