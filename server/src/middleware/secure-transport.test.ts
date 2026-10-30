import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { API_BASE_PATH } from '../route-groups.js';
import { createPipelineApp } from '../../test/pipeline-app.js';

const PROBE = `${API_BASE_PATH}/probe`;

function appFor(environment: 'development' | 'test' | 'production') {
  const reached: string[] = [];
  const { app } = createPipelineApp({
    config: { environment },
    trustProxyHops: 1,
    registerRoutes: ({ publicRoutes }) => {
      publicRoutes.get('/probe', (_req, res) => void res.send('read'));
      publicRoutes.post('/probe', (_req, res) => {
        reached.push('post');
        res.status(201).send('written');
      });
    },
  });
  return { app, reached };
}

describe('encrypted connections in production', () => {
  it('redirects a read over plain http to https on the configured host', async () => {
    const response = await request(appFor('production').app).get(`${PROBE}?page=2`);

    expect(response.status).toBe(308);
    expect(response.headers.location).toBe(`https://portfolio.example${PROBE}?page=2`);
  });

  it('never takes the redirect host from the request', async () => {
    const response = await request(appFor('production').app).get(PROBE).set('Host', 'evil.example');

    expect(response.headers.location).toBe(`https://portfolio.example${PROBE}`);
  });

  it('refuses a request that changes data over plain http, without running it', async () => {
    const { app, reached } = appFor('production');

    const response = await request(app).post(PROBE).send({ title: 'x' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(reached).toEqual([]);
  });

  it('serves requests that the proxy reports as https', async () => {
    const { app, reached } = appFor('production');

    await request(app).get(PROBE).set('X-Forwarded-Proto', 'https').expect(200, 'read');
    await request(app).post(PROBE).set('X-Forwarded-Proto', 'https').send({}).expect(201);

    expect(reached).toEqual(['post']);
  });

  it('ignores the forwarded protocol when no proxy is trusted', async () => {
    const { app } = createPipelineApp({
      config: { environment: 'production' },
      trustProxyHops: 0,
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.get('/probe', (_req, res) => void res.send('read'));
      },
    });

    const response = await request(app).get(PROBE).set('X-Forwarded-Proto', 'https');

    expect(response.status).toBe(308);
  });
});

describe('other environments', () => {
  it.each(['development', 'test'] as const)('does not redirect in %s', async (environment) => {
    await request(appFor(environment).app).get(PROBE).expect(200, 'read');
  });
});
