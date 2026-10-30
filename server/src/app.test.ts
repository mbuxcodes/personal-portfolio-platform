import { Server } from 'node:net';
import type { Express } from 'express';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { createMemoryLogger } from '../test/memory-logger.js';
import { createTestPipelineConfig } from '../test/pipeline-config.js';
import { ADMIN_GROUP_PATH, API_BASE_PATH, AUTH_GROUP_PATH } from './route-groups.js';

const pipeline = createTestPipelineConfig();

afterEach(() => {
  vi.restoreAllMocks();
});

function appWithEchoRoutes(trustProxyHops: number): Express {
  return createApp({
    logger: createMemoryLogger().logger,
    trustProxyHops,
    pipeline,
    registerRoutes: ({ publicRoutes }) => {
      publicRoutes.get('/client-address', (req, res) => {
        res.json({ ip: req.ip });
      });
    },
  });
}

describe('application factory', () => {
  it('returns an application without opening a port', async () => {
    const listen = vi.spyOn(Server.prototype, 'listen');

    const app = createApp({ logger: createMemoryLogger().logger, trustProxyHops: 0, pipeline });

    expect(typeof app).toBe('function');
    expect(listen).not.toHaveBeenCalled();
  });

  it('has no side effects when its modules are imported', async () => {
    vi.resetModules();
    const listen = vi.spyOn(Server.prototype, 'listen');
    const watched = ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection'];
    const before = watched.map((event) => process.listenerCount(event));

    await import('./app.js');
    await import('./route-groups.js');
    await import('./start-server.js');

    expect(watched.map((event) => process.listenerCount(event))).toEqual(before);
    expect(listen).not.toHaveBeenCalled();
  });

  it('does not identify the framework', async () => {
    const app = createApp({ logger: createMemoryLogger().logger, trustProxyHops: 0, pipeline });

    const response = await request(app).get('/anything');

    expect(app.get('x-powered-by')).toBe(false);
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
});

describe('trust proxy', () => {
  it('stores the configured number of proxy steps', () => {
    const { logger } = createMemoryLogger();

    expect(createApp({ logger, trustProxyHops: 0, pipeline }).get('trust proxy')).toBe(0);
    expect(createApp({ logger, trustProxyHops: 2, pipeline }).get('trust proxy')).toBe(2);
  });

  it('ignores the forwarded address when no proxy is trusted', async () => {
    const response = await request(appWithEchoRoutes(0))
      .get(`${API_BASE_PATH}/client-address`)
      .set('X-Forwarded-For', '203.0.113.9');

    expect(response.body.ip).not.toBe('203.0.113.9');
    expect(response.body.ip).toMatch(/127\.0\.0\.1|::1/);
  });

  it('trusts exactly the configured number of proxy steps', async () => {
    const forwarded = '198.51.100.7, 203.0.113.9';

    const oneStep = await request(appWithEchoRoutes(1))
      .get(`${API_BASE_PATH}/client-address`)
      .set('X-Forwarded-For', forwarded);
    const twoSteps = await request(appWithEchoRoutes(2))
      .get(`${API_BASE_PATH}/client-address`)
      .set('X-Forwarded-For', forwarded);

    expect(oneStep.body.ip).toBe('203.0.113.9');
    expect(twoSteps.body.ip).toBe('198.51.100.7');
  });
});

describe('route groups', () => {
  it('defines the base path once and derives the group paths from it', () => {
    expect(API_BASE_PATH).toBe('/api/v1');
    expect(AUTH_GROUP_PATH).toBe('/api/v1/auth');
    expect(ADMIN_GROUP_PATH).toBe('/api/v1/admin');
  });

  it('serves no route until a module attaches one', async () => {
    const app = createApp({ logger: createMemoryLogger().logger, trustProxyHops: 0, pipeline });

    for (const path of [
      API_BASE_PATH,
      AUTH_GROUP_PATH,
      ADMIN_GROUP_PATH,
      `${API_BASE_PATH}/anything`,
    ]) {
      expect((await request(app).get(path)).status).toBe(404);
    }
  });

  it('mounts each group at its own path', async () => {
    const app = createApp({
      logger: createMemoryLogger().logger,
      trustProxyHops: 0,
      pipeline,
      registerRoutes: ({ authRoutes, adminRoutes, publicRoutes }) => {
        authRoutes.get('/probe', (_req, res) => void res.send('auth'));
        adminRoutes.get('/probe', (_req, res) => void res.send('admin'));
        publicRoutes.get('/probe', (_req, res) => void res.send('public'));
      },
    });

    expect((await request(app).get(`${AUTH_GROUP_PATH}/probe`)).text).toBe('auth');
    expect((await request(app).get(`${ADMIN_GROUP_PATH}/probe`)).text).toBe('admin');
    expect((await request(app).get(`${API_BASE_PATH}/probe`)).text).toBe('public');
  });

  it('keeps the groups apart and nothing outside the base path', async () => {
    const app = createApp({
      logger: createMemoryLogger().logger,
      trustProxyHops: 0,
      pipeline,
      registerRoutes: ({ adminRoutes, publicRoutes }) => {
        adminRoutes.get('/only-admin', (_req, res) => void res.send('admin'));
        publicRoutes.get('/only-public', (_req, res) => void res.send('public'));
      },
    });

    expect((await request(app).get(`${API_BASE_PATH}/only-admin`)).status).toBe(404);
    expect((await request(app).get(`${ADMIN_GROUP_PATH}/only-public`)).status).toBe(404);
    expect((await request(app).get('/only-public')).status).toBe(404);
  });
});

describe('request logging', () => {
  it('writes one completion entry, with the request identifier, for every request', async () => {
    const { logger, entries } = createMemoryLogger();
    const app = createApp({
      logger,
      trustProxyHops: 0,
      pipeline,
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.get('/items/:id', (_req, res) => void res.send('ok'));
      },
    });

    await request(app).get(`${API_BASE_PATH}/items/1`).expect(200);
    await request(app).get(`${API_BASE_PATH}/missing`).expect(404);

    expect(entries.map((entry) => entry.event)).toEqual(['request_completed', 'request_completed']);
    expect(entries[0]).toMatchObject({
      method: 'GET',
      route: `${API_BASE_PATH}/items/:id`,
      status: 200,
    });
    expect(entries[1]).toMatchObject({ route: null, status: 404 });
    expect(entries[0]?.requestId).not.toBe(entries[1]?.requestId);
  });

  it('never writes credentials, cookies, or request bodies sent through any route group', async () => {
    const { logger, output, entries } = createMemoryLogger();
    const app = createApp({
      logger,
      trustProxyHops: 0,
      pipeline,
      registerRoutes: ({ authRoutes, adminRoutes, publicRoutes }) => {
        for (const group of [authRoutes, adminRoutes, publicRoutes]) {
          group.use(express.json());
          group.post('/submit', (_req, res) => void res.status(201).send('ok'));
        }
      },
    });

    for (const base of [AUTH_GROUP_PATH, ADMIN_GROUP_PATH, API_BASE_PATH]) {
      await request(app)
        .post(`${base}/submit`)
        .set('Authorization', 'Bearer AUTH_CANARY')
        .set('Cookie', 'session=COOKIE_CANARY')
        .send({ password: 'PASSWORD_CANARY', token: 'TOKEN_CANARY', title: 'BODY_CANARY' })
        .expect(201);
    }

    expect(entries).toHaveLength(3);
    expect(output()).not.toMatch(/CANARY|SUPER_SECRET_123/);
  });
});
