import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express, { type Express } from 'express';
import supertest from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createRequestTracing } from '#middleware/request-tracing';
import { createLogger } from '#utils/logger';
import { getRequestContext } from '#utils/request-context';
import { createDeferred } from '../../test/deferred.js';
import { createMemoryLogger } from '../../test/memory-logger.js';

const servers: Server[] = [];

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    server.close();
  }
});

function setup(options: { now?: () => number } = {}) {
  const memory = createMemoryLogger();
  const app = express();
  app.use(createRequestTracing({ logger: memory.logger, ...options }));
  return { ...memory, app };
}

const completions = (entries: { event: string }[]) =>
  entries.filter((entry) => entry.event === 'request_completed');

describe('request tracing', () => {
  it('writes exactly one completion entry for a request', async () => {
    const { app, entries } = setup();
    app.get('/ping', (_request, response) => void response.send('pong'));

    await supertest(app).get('/ping').expect(200);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ level: 'info', event: 'request_completed' });
  });

  it('writes one completion entry per request, however many requests there are', async () => {
    const { app, entries } = setup();
    app.get('/ping', (_request, response) => void response.send('pong'));

    for (let count = 0; count < 25; count += 1) await supertest(app).get('/ping');

    expect(completions(entries)).toHaveLength(25);
    expect(entries).toHaveLength(25);
  });

  it('records the identifier, method, route pattern, status, and duration', async () => {
    const times = [1000, 1042.4];
    const { app, entries } = setup({ now: () => times.shift() ?? 0 });
    app.post('/items/:id', (_request, response) => void response.status(201).send('created'));

    await supertest(app).post('/items/abc123').expect(201);

    expect(entries[0]).toEqual({
      level: 'info',
      time: expect.any(String),
      event: 'request_completed',
      requestId: expect.stringMatching(/^req_[0-9a-f]{16}$/),
      method: 'POST',
      route: '/items/:id',
      status: 201,
      durationMs: 42,
      aborted: false,
    });
  });

  it('logs the route pattern, never the real path, query, or parameter values', async () => {
    const { app, output } = setup();
    app.get('/items/:id', (_request, response) => void response.send('ok'));

    await supertest(app).get('/items/PATH_CANARY?token=QUERY_CANARY&email=person@canary.test');

    expect(output()).toContain('/items/:id');
    expect(output()).not.toMatch(/PATH_CANARY|QUERY_CANARY|canary/);
  });

  it('records a null route when no route handled the request', async () => {
    const { app, entries } = setup();

    await supertest(app).get('/nothing-here/PATH_CANARY').expect(404);

    expect(entries[0]).toMatchObject({ route: null, status: 404 });
    expect(JSON.stringify(entries)).not.toContain('PATH_CANARY');
  });

  it('records the status of a request that failed', async () => {
    const { app, entries } = setup();
    app.get('/broken', () => {
      throw new Error('handler failure');
    });

    await supertest(app).get('/broken').expect(500);

    expect(completions(entries)).toHaveLength(1);
    expect(entries[0]).toMatchObject({ status: 500, route: '/broken' });
  });

  it('records the full pattern of a route in a mounted router, including after an error', async () => {
    const { app, entries } = setup();
    const router = express.Router();
    router.get('/projects/:id', (_request, response) => void response.send('ok'));
    router.get('/fail', () => {
      throw new Error('router failure');
    });
    app.use('/api/v1', router);

    await supertest(app).get('/api/v1/projects/PATH_CANARY').expect(200);
    await supertest(app).get('/api/v1/fail').expect(500);

    expect(entries[0]).toMatchObject({ route: '/api/v1/projects/:id' });
    expect(entries[1]).toMatchObject({ route: '/api/v1/fail', status: 500 });
  });

  describe('identifiers', () => {
    it('are different for every request', async () => {
      const { app, entries } = setup();
      app.get('/ping', (_request, response) => void response.send('pong'));

      for (let count = 0; count < 50; count += 1) await supertest(app).get('/ping');

      const ids = entries.map((entry) => entry.requestId);
      expect(new Set(ids).size).toBe(50);
    });

    it('are never taken from anything the client sends', async () => {
      const { app, entries } = setup();
      app.use(express.json());
      app.post('/echo', (_request, response) => void response.send('ok'));

      await supertest(app)
        .post('/echo')
        .set('X-Request-Id', 'req_FORGED_BY_CLIENT')
        .set('X-Correlation-Id', 'req_FORGED_BY_CLIENT')
        .set('Request-Id', 'req_FORGED_BY_CLIENT')
        .send({ requestId: 'req_FORGED_BY_CLIENT', id: 'req_FORGED_BY_CLIENT' });

      expect(entries[0]?.requestId).toMatch(/^req_[0-9a-f]{16}$/);
      expect(JSON.stringify(entries)).not.toContain('FORGED_BY_CLIENT');
    });

    it('are available to later middleware and handlers, and are the identifier that is logged', async () => {
      const { app, entries } = setup();
      const seen: (string | undefined)[] = [];
      app.use((_request, response, next) => {
        seen.push(getRequestContext(response)?.requestId);
        next();
      });
      app.get('/ping', (_request, response) => {
        seen.push(getRequestContext(response)?.requestId);
        response.send('pong');
      });

      await supertest(app).get('/ping');

      expect(seen[0]).toBeDefined();
      expect(seen[1]).toBe(seen[0]);
      expect(entries[0]?.requestId).toBe(seen[0]);
    });

    it('are available to an error handler', async () => {
      const { app } = setup();
      let seenByErrorHandler: string | undefined;
      app.get('/broken', () => {
        throw new Error('handler failure');
      });
      app.use(
        (
          _error: unknown,
          _request: express.Request,
          response: express.Response,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express recognizes an error handler by its four parameters
          _next: express.NextFunction,
        ) => {
          seenByErrorHandler = getRequestContext(response)?.requestId;
          response.status(500).send('failed');
        },
      );

      await supertest(app).get('/broken');

      expect(seenByErrorHandler).toMatch(/^req_[0-9a-f]{16}$/);
    });

    it('give later layers a logger that carries the identifier', async () => {
      const { app, entries } = setup();
      app.get('/ping', (_request, response) => {
        getRequestContext(response)?.logger.info('handler_event');
        response.send('pong');
      });

      await supertest(app).get('/ping');

      const handlerEntry = entries.find((entry) => entry.event === 'handler_event');
      const completion = entries.find((entry) => entry.event === 'request_completed');
      expect(handlerEntry?.requestId).toBeDefined();
      expect(handlerEntry?.requestId).toBe(completion?.requestId);
    });
  });

  it('writes the completion entry once when the client disconnects before the response', async () => {
    const entries: Record<string, unknown>[] = [];
    const completed = createDeferred();
    const entered = createDeferred();
    const logger = createLogger({
      write: (line) => {
        const entry = JSON.parse(line) as Record<string, unknown>;
        entries.push(entry);
        if (entry.event === 'request_completed') completed.resolve();
      },
    });
    const app = express();
    app.use(createRequestTracing({ logger }));
    app.get('/slow', () => {
      entered.resolve();
    });
    const server = app.listen(0);
    servers.push(server);

    const clientRequest = httpRequest({
      port: (server.address() as AddressInfo).port,
      path: '/slow',
    });
    clientRequest.on('error', () => undefined);
    clientRequest.end();
    await entered.promise;
    clientRequest.destroy();
    await completed.promise;

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ aborted: true, route: '/slow' });
  });
});

describe('what is never logged', () => {
  const CANARIES = [
    'PASSWORD_CANARY',
    'TOKEN_CANARY',
    'COOKIE_CANARY',
    'AUTH_CANARY',
    'SUPER_SECRET_123',
    'BODY_CANARY',
    'SENDER_CANARY',
    'MESSAGE_CANARY',
    'ARTICLE_CANARY',
  ];

  async function sendSensitiveRequest(app: Express) {
    return supertest(app)
      .post('/api/contact/items/PATH_CANARY?token=TOKEN_CANARY')
      .set('Authorization', 'Bearer AUTH_CANARY')
      .set('Cookie', 'session=COOKIE_CANARY; refresh=TOKEN_CANARY')
      .set('X-Api-Key', 'SUPER_SECRET_123')
      .send({
        password: 'PASSWORD_CANARY',
        senderName: 'SENDER_CANARY',
        senderEmail: 'visitor@canary.test',
        messageText: 'MESSAGE_CANARY',
        body: 'ARTICLE_CANARY',
        title: 'BODY_CANARY',
      });
  }

  it('is absent from the entries of a request that carries it, because it is never read', async () => {
    const { app, output, entries } = setup();
    app.use(express.json());
    app.post(
      '/api/contact/items/:id',
      (_request, response) => void response.status(201).send('ok'),
    );

    await sendSensitiveRequest(app).then((response) => expect(response.status).toBe(201));

    expect(entries).toHaveLength(1);
    for (const canary of [...CANARIES, 'PATH_CANARY']) expect(output()).not.toContain(canary);
    expect(output()).not.toContain('canary');
  });

  it('is absent even when a handler logs the whole request, because redaction works by rule', async () => {
    const { app, output } = setup();
    app.use(express.json());
    app.post('/api/contact/items/:id', (request, response) => {
      getRequestContext(response)?.logger.info('careless_handler', {
        headers: request.headers,
        body: request.body,
        payload: { ...request.body },
        query: request.query,
        cookies: { raw: request.headers.cookie },
      });
      response.status(201).send('ok');
    });

    await sendSensitiveRequest(app);

    expect(output()).toContain('careless_handler');
    for (const canary of CANARIES) expect(output()).not.toContain(canary);
    expect(output()).not.toContain('visitor@canary.test');
  });

  it('is absent from an error entry that repeats a configured secret', async () => {
    const memory = createMemoryLogger({ secrets: ['SUPER_SECRET_123'] });
    const app = express();
    app.use(createRequestTracing({ logger: memory.logger }));
    app.get('/fail', (_request, response) => {
      const logger = getRequestContext(response)?.logger;
      logger?.error('operation_failed', {
        error: { name: 'Error', message: 'rejected key SUPER_SECRET_123' },
      });
      response.status(500).send('failed');
    });

    await supertest(app).get('/fail');

    expect(memory.output()).toContain('operation_failed');
    expect(memory.output()).not.toContain('SUPER_SECRET_123');
  });
});
