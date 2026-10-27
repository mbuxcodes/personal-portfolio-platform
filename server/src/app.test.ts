import { Server } from 'node:net';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { ADMIN_GROUP_PATH, API_BASE_PATH, AUTH_GROUP_PATH } from './route-groups.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function appWithEchoRoutes(trustProxyHops: number): Express {
  return createApp({
    trustProxyHops,
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

    const app = createApp({ trustProxyHops: 0 });

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
    const app = createApp({ trustProxyHops: 0 });

    const response = await request(app).get('/anything');

    expect(app.get('x-powered-by')).toBe(false);
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
});

describe('trust proxy', () => {
  it('stores the configured number of proxy steps', () => {
    expect(createApp({ trustProxyHops: 0 }).get('trust proxy')).toBe(0);
    expect(createApp({ trustProxyHops: 2 }).get('trust proxy')).toBe(2);
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
    const app = createApp({ trustProxyHops: 0 });

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
      trustProxyHops: 0,
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
      trustProxyHops: 0,
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
