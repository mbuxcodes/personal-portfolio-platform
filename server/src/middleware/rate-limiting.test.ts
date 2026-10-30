import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { RateLimitsConfig } from '#config/configuration';
import { ADMIN_GROUP_PATH, API_BASE_PATH, AUTH_GROUP_PATH } from '../route-groups.js';
import { createPipelineApp, type PipelineAppOptions } from '../../test/pipeline-app.js';
import { createTestPipelineConfig } from '../../test/pipeline-config.js';

function limits(overrides: Partial<RateLimitsConfig>): RateLimitsConfig {
  return { ...createTestPipelineConfig().rateLimits, ...overrides };
}

function appWithProbes(rateLimits: RateLimitsConfig, extra: Partial<PipelineAppOptions> = {}) {
  return createPipelineApp({
    config: { rateLimits },
    registerRoutes: ({ authRoutes, adminRoutes, publicRoutes }, protections) => {
      authRoutes.get('/probe', (_req, res) => void res.send('auth'));
      adminRoutes.get('/probe', (_req, res) => void res.send('admin'));
      publicRoutes.get('/probe', (_req, res) => void res.send('public'));
      publicRoutes.post('/messages', protections.rateLimiters.contact, (_req, res) => {
        res.status(201).send('contact');
      });
      authRoutes.post('/login', protections.rateLimiters.signIn, (_req, res) => {
        res.status(200).send('sign-in');
      });
      authRoutes.post('/refresh', protections.rateLimiters.renewal, (_req, res) => {
        res.status(200).send('renewal');
      });
      adminRoutes.post('/images', protections.rateLimiters.upload, (_req, res) => {
        res.status(201).send('upload');
      });
    },
    ...extra,
  });
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

describe('route-group rate limiting', () => {
  it('answers 429 TOO_MANY_REQUESTS with Retry-After once the limit is reached', async () => {
    const { app } = appWithProbes(limits({ publicRead: { max: 2, windowSeconds: 1 } }));

    await request(app).get(`${API_BASE_PATH}/probe`).expect(200);
    await request(app).get(`${API_BASE_PATH}/probe`).expect(200);
    const blocked = await request(app).get(`${API_BASE_PATH}/probe`);

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.body.error.requestId).toMatch(/^req_/);
    expect(blocked.headers['retry-after']).toMatch(/^[1-9]\d*$/);
    expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(1);
  });

  it('allows requests again once the window has passed', async () => {
    const { app } = appWithProbes(limits({ publicRead: { max: 1, windowSeconds: 1 } }));

    await request(app).get(`${API_BASE_PATH}/probe`).expect(200);
    await request(app).get(`${API_BASE_PATH}/probe`).expect(429);
    await sleep(1200);

    await request(app).get(`${API_BASE_PATH}/probe`).expect(200);
  });

  it('takes the maximum and the window from configuration', async () => {
    for (const max of [1, 3]) {
      const { app } = appWithProbes(limits({ publicRead: { max, windowSeconds: 60 } }));

      for (let sent = 0; sent < max; sent += 1) {
        await request(app).get(`${API_BASE_PATH}/probe`).expect(200);
      }
      const blocked = await request(app).get(`${API_BASE_PATH}/probe`).expect(429);

      expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(60);
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(1);
    }
  });

  it('counts each group on its own', async () => {
    const { app } = appWithProbes(
      limits({
        publicRead: { max: 1, windowSeconds: 60 },
        admin: { max: 2, windowSeconds: 60 },
      }),
    );

    await request(app).get(`${API_BASE_PATH}/probe`).expect(200);
    await request(app).get(`${API_BASE_PATH}/probe`).expect(429);

    // The public group is used up. The other groups are not affected.
    await request(app).get(`${ADMIN_GROUP_PATH}/probe`).expect(200);
    await request(app).get(`${ADMIN_GROUP_PATH}/probe`).expect(200);
    await request(app).get(`${ADMIN_GROUP_PATH}/probe`).expect(429);
    await request(app).get(`${AUTH_GROUP_PATH}/probe`).expect(200, 'auth');
    await request(app).get(`${AUTH_GROUP_PATH}/probe`).expect(200, 'auth');
    await request(app).get(`${AUTH_GROUP_PATH}/probe`).expect(429);
  });

  it('counts every path outside the admin and auth groups as public', async () => {
    const { app } = appWithProbes(limits({ publicRead: { max: 2, windowSeconds: 60 } }));

    await request(app).get('/robots.txt').expect(404);
    await request(app).get(`${API_BASE_PATH}/missing`).expect(404);
    await request(app).get(`${API_BASE_PATH}/probe`).expect(429);
  });

  it('cannot be avoided by changing the case of the group path', async () => {
    const { app } = appWithProbes(limits({ admin: { max: 1, windowSeconds: 60 } }));

    await request(app).get(`${ADMIN_GROUP_PATH}/probe`).expect(200);
    await request(app).get(`${ADMIN_GROUP_PATH.toUpperCase()}/probe`).expect(429);
  });

  it('counts clients separately, by the address of the trusted proxy step', async () => {
    const { app } = appWithProbes(limits({ publicRead: { max: 1, windowSeconds: 60 } }), {
      trustProxyHops: 1,
    });
    const asClient = (address: string) =>
      request(app).get(`${API_BASE_PATH}/probe`).set('X-Forwarded-For', address);

    await asClient('203.0.113.1').expect(200);
    await asClient('203.0.113.1').expect(429);
    await asClient('203.0.113.2').expect(200);
  });

  it('still sends the security headers, the request identifier, and the completion entry', async () => {
    const { app, entries } = appWithProbes(limits({ publicRead: { max: 1, windowSeconds: 60 } }));
    await request(app).get(`${API_BASE_PATH}/probe`).expect(200);

    const blocked = await request(app).get(`${API_BASE_PATH}/probe`).expect(429);

    expect(blocked.headers['content-security-policy']).toBeDefined();
    expect(entries.filter((entry) => entry.event === 'request_completed')).toHaveLength(2);
    expect(entries.at(-1)).toMatchObject({ event: 'request_completed', status: 429 });
    expect(entries.at(-1)?.requestId).toBe(blocked.body.error.requestId);
  });

  it('logs one warning with the group and a client indicator, and never the address', async () => {
    const { app, entries, output } = appWithProbes(
      limits({ publicRead: { max: 1, windowSeconds: 60 } }),
      { trustProxyHops: 1 },
    );
    const asClient = () =>
      request(app).get(`${API_BASE_PATH}/probe`).set('X-Forwarded-For', '203.0.113.77');

    await asClient().expect(200);
    await asClient().expect(429);

    const warnings = entries.filter((entry) => entry.event === 'rate_limit_triggered');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      level: 'warn',
      category: 'security',
      group: 'public',
      limit: 1,
      windowSeconds: 60,
    });
    expect(warnings[0]?.clientIndicator).toMatch(/^[0-9a-f]{12}$/);
    expect(warnings[0]?.requestId).toMatch(/^req_/);
    expect(output()).not.toContain('203.0.113.77');
  });
});

describe('stricter limits for single endpoints', () => {
  it.each([
    ['contact', `${API_BASE_PATH}/messages`, 'contact'],
    ['signIn', `${AUTH_GROUP_PATH}/login`, 'sign_in'],
    ['renewal', `${AUTH_GROUP_PATH}/refresh`, 'renewal'],
    ['upload', `${ADMIN_GROUP_PATH}/images`, 'upload'],
  ] as const)('applies the %s limit to its own route only', async (name, path, group) => {
    const { app, entries } = appWithProbes(
      limits({ [name]: { max: 1, windowSeconds: 60 } } as Partial<RateLimitsConfig>),
    );

    await request(app)
      .post(path)
      .expect((response) => expect(response.status).toBeLessThan(300));
    const blocked = await request(app).post(path).expect(429);

    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['retry-after']).toMatch(/^\d+$/);
    expect(entries.find((entry) => entry.event === 'rate_limit_triggered')?.group).toBe(group);
    // Other routes of the same group are not affected.
    await request(app).get(`${API_BASE_PATH}/probe`).expect(200);
  });

  it('keeps a strict limit separate from the group limit', async () => {
    const { app } = appWithProbes(
      limits({
        publicRead: { max: 3, windowSeconds: 60 },
        contact: { max: 1, windowSeconds: 60 },
      }),
    );

    await request(app).post(`${API_BASE_PATH}/messages`).expect(201);
    await request(app).post(`${API_BASE_PATH}/messages`).expect(429);

    // The refused contact request used the group limit once more, and nothing else did.
    await request(app).get(`${API_BASE_PATH}/probe`).expect(200);
    await request(app).get(`${API_BASE_PATH}/probe`).expect(429);
  });

  it('never says anything about accounts when sign-in is limited', async () => {
    const { app } = appWithProbes(limits({ signIn: { max: 1, windowSeconds: 60 } }));
    await request(app).post(`${AUTH_GROUP_PATH}/login`).expect(200);

    const blocked = await request(app).post(`${AUTH_GROUP_PATH}/login`).expect(429);

    expect(Object.keys(blocked.body.error).sort()).toEqual(['code', 'message', 'requestId']);
    expect(blocked.body.error.message).not.toMatch(/account|email|password|user/i);
  });
});
