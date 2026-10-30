import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '#config/configuration';
import { JSON_BODY_LIMIT_BYTES, MULTIPART_OVERHEAD_BYTES } from '#middleware/body-limits';
import { pipelineConfigOf } from '#middleware/pipeline';
import { ADMIN_GROUP_PATH, API_BASE_PATH, AUTH_GROUP_PATH } from '../route-groups.js';
import { createPipelineApp } from '../../test/pipeline-app.js';
import { createTestPipelineConfig } from '../../test/pipeline-config.js';

const REQUIRED_ENVIRONMENT = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mongodb://localhost:27017/portfolio-test',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-api-key',
  CLOUDINARY_API_SECRET: 'test-api-secret',
  CLOUDINARY_FOLDER: 'portfolio-test',
  ACCESS_TOKEN_SECRET: 'test-access-secret-0123456789abcdef',
  REFRESH_TOKEN_SECRET: 'test-refresh-secret-fedcba9876543210',
  SITE_URL: 'https://portfolio.test',
};

const PROBE = `${API_BASE_PATH}/probe`;

describe('pipeline configuration', () => {
  it('reads every setting from the validated configuration', () => {
    const config = loadConfig({
      ...REQUIRED_ENVIRONMENT,
      RATE_LIMIT_PUBLIC_READ_MAX: '7',
      RATE_LIMIT_PUBLIC_READ_WINDOW_SECONDS: '45',
      UPLOAD_MAX_BYTES: '1000000',
    });

    const pipeline = pipelineConfigOf(config);

    expect(pipeline.environment).toBe('production');
    expect(pipeline.siteUrl).toBe('https://portfolio.test');
    expect(pipeline.mediaCloudName).toBe('test-cloud');
    expect(pipeline.rateLimits).toBe(config.rateLimits);
    expect(pipeline.rateLimits.publicRead).toEqual({ max: 7, windowSeconds: 45 });
    expect(pipeline.bodyLimits).toEqual({
      jsonBytes: JSON_BODY_LIMIT_BYTES,
      multipartBytes: 1_000_000 + MULTIPART_OVERHEAD_BYTES,
    });
  });

  it('allows a multipart request of the largest upload plus its overhead', () => {
    const config = loadConfig(REQUIRED_ENVIRONMENT);

    expect(pipelineConfigOf(config).bodyLimits.multipartBytes).toBeGreaterThan(
      config.limits.uploadMaxBytes,
    );
  });
});

describe('order of the pipeline (ARCHITECTURE_DESIGN.md Section 7.3)', () => {
  function createAppForOrder() {
    const reached: string[] = [];
    const result = createPipelineApp({
      config: {
        rateLimits: {
          ...createTestPipelineConfig().rateLimits,
          publicRead: { max: 1, windowSeconds: 60 },
        },
      },
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.all('/probe', (req, res) => {
          reached.push(req.method);
          res.send('ok');
        });
      },
    });
    return { ...result, reached };
  }

  it('step 1 comes first: every refusal has a request identifier and one completion entry', async () => {
    const { app, entries } = createAppForOrder();

    const first = await request(app).post(PROBE).set('Content-Type', 'text/plain').send('x');
    const second = await request(app).get(PROBE);

    expect(first.body.error.requestId).toMatch(/^req_/);
    expect(second.body.error.requestId).toMatch(/^req_/);
    expect(entries.filter((entry) => entry.event === 'request_completed')).toHaveLength(2);
    expect(entries.filter((entry) => entry.event === 'request_completed')[0]).toMatchObject({
      status: 415,
    });
  });

  it('step 2 comes before step 3: a rate-limited response has the security headers', async () => {
    const { app } = createAppForOrder();
    await request(app).get(PROBE).expect(200);

    const blocked = await request(app).get(PROBE).expect(429);

    expect(blocked.headers['content-security-policy']).toBeDefined();
    expect(blocked.headers['x-content-type-options']).toBe('nosniff');
  });

  it('step 3 comes before step 4: a limited client is refused before its body is judged', async () => {
    const { app } = createAppForOrder();
    await request(app).get(PROBE).expect(200);

    const response = await request(app)
      .post(PROBE)
      .set('Content-Type', 'text/plain')
      .send('x'.repeat(5000));

    expect(response.status).toBe(429);
  });

  it('step 4 comes before the route: a refused body never reaches it', async () => {
    const { app, reached } = createAppForOrder();

    await request(app).post(PROBE).set('Content-Type', 'text/plain').send('x').expect(415);

    expect(reached).toEqual([]);
  });

  it('step 4 comes before the route: the route sees the parsed body and the parsed cookies', async () => {
    const { app } = createPipelineApp({
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.post('/probe', (req, res) => {
          res.json({ body: req.body, cookies: req.cookies });
        });
      },
    });

    const response = await request(app)
      .post(PROBE)
      .set('Cookie', 'a=1; b=two')
      .send({ title: 'hello' })
      .expect(200);

    expect(response.body).toEqual({ body: { title: 'hello' }, cookies: { a: '1', b: 'two' } });
  });

  it('applies the same pipeline to the auth, admin, and public groups', async () => {
    const { app } = createPipelineApp({
      registerRoutes: ({ authRoutes, adminRoutes, publicRoutes }) => {
        for (const group of [authRoutes, adminRoutes, publicRoutes]) {
          group.post('/probe', (_req, res) => void res.send('ok'));
        }
      },
    });

    for (const base of [AUTH_GROUP_PATH, ADMIN_GROUP_PATH, API_BASE_PATH]) {
      const response = await request(app)
        .post(`${base}/probe`)
        .set('Content-Type', 'text/plain')
        .send('x');

      expect(response.status).toBe(415);
      expect(response.headers['content-security-policy']).toBeDefined();
    }
  });
});

describe('response compression', () => {
  const big = { items: Array.from({ length: 200 }, (_, index) => `item number ${index}`) };

  function createAppWithResponses() {
    return createPipelineApp({
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.get('/big', (_req, res) => void res.json(big));
        publicRoutes.get('/small', (_req, res) => void res.json({ ok: true }));
      },
    }).app;
  }

  it('compresses a large JSON response when the client accepts it', async () => {
    const response = await request(createAppWithResponses())
      .get(`${API_BASE_PATH}/big`)
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.headers.vary).toMatch(/Accept-Encoding/i);
    expect(response.body).toEqual(big);
  });

  it('sends the response as it is when the client does not accept compression', async () => {
    const response = await request(createAppWithResponses())
      .get(`${API_BASE_PATH}/big`)
      .set('Accept-Encoding', 'identity')
      .expect(200);

    expect(response.headers).not.toHaveProperty('content-encoding');
    expect(response.body).toEqual(big);
  });

  it('does not compress a small response', async () => {
    const response = await request(createAppWithResponses())
      .get(`${API_BASE_PATH}/small`)
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(response.headers).not.toHaveProperty('content-encoding');
  });

  it('keeps the security headers on a compressed response', async () => {
    const response = await request(createAppWithResponses())
      .get(`${API_BASE_PATH}/big`)
      .set('Accept-Encoding', 'gzip');

    expect(response.headers['content-security-policy']).toBeDefined();
  });
});

describe('no cross-origin resource sharing', () => {
  function createAppWithProbe() {
    return createPipelineApp({
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.get('/probe', (_req, res) => void res.send('ok'));
        publicRoutes.post('/probe', (_req, res) => void res.send('ok'));
      },
    }).app;
  }

  const corsHeaders = (headers: Record<string, unknown>): string[] =>
    Object.keys(headers).filter((name) => name.startsWith('access-control-'));

  it('sends no access-control header on a request from another origin', async () => {
    const response = await request(createAppWithProbe())
      .get(PROBE)
      .set('Origin', 'https://evil.example')
      .expect(200);

    expect(corsHeaders(response.headers)).toEqual([]);
  });

  it('answers a preflight request without granting anything', async () => {
    const response = await request(createAppWithProbe())
      .options(PROBE)
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(corsHeaders(response.headers)).toEqual([]);
  });

  it('sends no access-control header on a refusal or a missing route', async () => {
    const app = createAppWithProbe();

    const refused = await request(app)
      .post(PROBE)
      .set('Origin', 'https://evil.example')
      .set('Content-Type', 'text/plain')
      .send('x')
      .expect(415);
    const missing = await request(app)
      .get(`${API_BASE_PATH}/missing`)
      .set('Origin', 'https://evil.example')
      .expect(404);

    expect(corsHeaders(refused.headers)).toEqual([]);
    expect(corsHeaders(missing.headers)).toEqual([]);
  });

  it('keeps responses from being shared across origins', async () => {
    const response = await request(createAppWithProbe()).get(PROBE);

    expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
  });
});
