import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ADMIN_GROUP_PATH } from '../route-groups.js';
import { createPipelineApp } from '../../test/pipeline-app.js';
import { requestWith, type WriteMethod } from '../../test/write-request.js';

const PROBE = `${ADMIN_GROUP_PATH}/probe`;
const SITE = 'https://portfolio.example';
const METHODS: readonly WriteMethod[] = ['post', 'put', 'patch', 'delete'];

function createAppWithCheckedRoutes(siteUrl = SITE) {
  const reached: string[] = [];
  const { app, ...rest } = createPipelineApp({
    config: { siteUrl },
    registerRoutes: ({ adminRoutes }, { crossSiteCheck }) => {
      adminRoutes.use(crossSiteCheck);
      adminRoutes.all('/probe', (req, res) => {
        reached.push(req.method);
        res.send('ok');
      });
    },
  });
  return { app, reached, ...rest };
}

describe('origin verification', () => {
  it.each(METHODS)('lets a %s from the site’s own origin through', async (method) => {
    const { app, reached } = createAppWithCheckedRoutes();

    await requestWith(app, method, PROBE).set('Origin', SITE).expect(200);

    expect(reached).toHaveLength(1);
  });

  it.each(METHODS)('refuses a %s without an origin with 403 FORBIDDEN', async (method) => {
    const { app, reached } = createAppWithCheckedRoutes();

    const response = await requestWith(app, method, PROBE);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.requestId).toMatch(/^req_/);
    expect(reached).toEqual([]);
  });

  it.each([
    ['another site', 'https://evil.example'],
    ['a look-alike host', 'https://portfolio.example.evil.example'],
    ['another scheme', 'http://portfolio.example'],
    ['another port', 'https://portfolio.example:8443'],
    ['a subdomain', 'https://admin.portfolio.example'],
    ['a trailing slash', 'https://portfolio.example/'],
    ['the sandboxed-page origin', 'null'],
    ['an empty origin', ''],
  ])('refuses an origin that is %s', async (_name, origin) => {
    const { app, reached } = createAppWithCheckedRoutes();

    await request(app).post(PROBE).set('Origin', origin).expect(403);

    expect(reached).toEqual([]);
  });

  it('compares with the origin of the configured address, ignoring any path in it', async () => {
    const { app } = createAppWithCheckedRoutes('https://portfolio.example/some/path/');

    await request(app).post(PROBE).set('Origin', SITE).expect(200);
  });

  it('does not check reads', async () => {
    const { app } = createAppWithCheckedRoutes();

    await request(app).get(PROBE).expect(200);
    await request(app).get(PROBE).set('Origin', 'https://evil.example').expect(200);
    await request(app).head(PROBE).expect(200);
  });
});

describe('fetch-site verification', () => {
  it('lets a request through that the browser reports as same-origin', async () => {
    const { app } = createAppWithCheckedRoutes();

    await request(app)
      .post(PROBE)
      .set('Origin', SITE)
      .set('Sec-Fetch-Site', 'same-origin')
      .expect(200);
  });

  it.each(['cross-site', 'same-site', 'none'])(
    'refuses a request that the browser reports as %s, even with the right origin',
    async (fetchSite) => {
      const { app, reached } = createAppWithCheckedRoutes();

      const response = await request(app)
        .post(PROBE)
        .set('Origin', SITE)
        .set('Sec-Fetch-Site', fetchSite);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(reached).toEqual([]);
    },
  );

  it('does not refuse a request from a browser that sends no fetch-site header', async () => {
    const { app } = createAppWithCheckedRoutes();

    await request(app).post(PROBE).set('Origin', SITE).expect(200);
  });

  it('does not check reads', async () => {
    const { app } = createAppWithCheckedRoutes();

    await request(app).get(PROBE).set('Sec-Fetch-Site', 'cross-site').expect(200);
  });
});

describe('refusals', () => {
  it('are logged as security events with a reason, and never with what the client sent', async () => {
    const { app, entries, output } = createAppWithCheckedRoutes();

    await request(app).post(PROBE).expect(403);
    await request(app).post(PROBE).set('Origin', 'https://evil-canary.example').expect(403);
    await request(app)
      .post(PROBE)
      .set('Origin', SITE)
      .set('Sec-Fetch-Site', 'cross-site')
      .expect(403);

    const refusals = entries.filter((entry) => entry.event === 'cross_site_request_refused');
    expect(refusals.map((entry) => entry.reason)).toEqual([
      'origin_missing',
      'origin_mismatch',
      'fetch_site_mismatch',
    ]);
    expect(refusals.every((entry) => entry.level === 'warn' && entry.category === 'security')).toBe(
      true,
    );
    expect(output()).not.toContain('evil-canary');
  });

  it('are not sent to routes that did not attach the check', async () => {
    const { app } = createPipelineApp({
      registerRoutes: ({ adminRoutes }) => {
        adminRoutes.post('/unchecked', (_req, res) => void res.send('ok'));
      },
    });

    await request(app).post(`${ADMIN_GROUP_PATH}/unchecked`).expect(200);
  });
});
