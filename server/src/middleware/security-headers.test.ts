import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from '#middleware/security-headers';
import { API_BASE_PATH } from '../route-groups.js';
import { createPipelineApp } from '../../test/pipeline-app.js';

const PROBE = `${API_BASE_PATH}/probe`;

const withProbe = (environment: 'development' | 'test' | 'production') =>
  createPipelineApp({
    config: { environment },
    // One trusted proxy and a forwarded protocol, so production does not redirect.
    trustProxyHops: 1,
    registerRoutes: ({ publicRoutes }) => {
      publicRoutes.get('/probe', (_req, res) => void res.json({ ok: true }));
    },
  }).app;

async function headersOf(environment: 'development' | 'test' | 'production') {
  const response = await request(withProbe(environment))
    .get(PROBE)
    .set('X-Forwarded-Proto', 'https')
    .expect(200);
  return response.headers;
}

function directivesOf(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy
      .split(';')
      .map((directive) => directive.trim().split(/\s+/))
      .filter(([name]) => name !== '' && name !== undefined)
      .map(([name, ...values]) => [name, values]),
  );
}

describe('content security policy', () => {
  it('is strict in production: this site only, no inline code, no framing', async () => {
    const policy = directivesOf((await headersOf('production'))['content-security-policy'] ?? '');

    expect(policy['default-src']).toEqual(["'self'"]);
    expect(policy['script-src']).toEqual(["'self'"]);
    expect(policy['script-src-attr']).toEqual(["'none'"]);
    expect(policy['style-src']).toEqual(["'self'"]);
    expect(policy['font-src']).toEqual(["'self'"]);
    expect(policy['connect-src']).toEqual(["'self'"]);
    expect(policy['object-src']).toEqual(["'none'"]);
    expect(policy['base-uri']).toEqual(["'self'"]);
    expect(policy['form-action']).toEqual(["'self'"]);
    expect(policy['frame-ancestors']).toEqual(["'none'"]);
    expect(policy).toHaveProperty('upgrade-insecure-requests');
  });

  it('allows images from this site and from this site’s folder at the media service only', async () => {
    const policy = directivesOf((await headersOf('production'))['content-security-policy'] ?? '');

    expect(policy['img-src']).toEqual(["'self'", 'https://res.cloudinary.com/demo-cloud/']);
  });

  it('never allows inline code, dynamic code, data addresses, or wildcards in production', async () => {
    const header = (await headersOf('production'))['content-security-policy'] ?? '';

    expect(header).not.toContain('unsafe-inline');
    expect(header).not.toContain('unsafe-eval');
    expect(header).not.toContain('data:');
    expect(header).not.toMatch(/\*/);
    expect(header).not.toContain('ws:');
  });

  it('is the strict policy in every environment except development', async () => {
    const production = (await headersOf('production'))['content-security-policy'];
    const test = (await headersOf('test'))['content-security-policy'];

    expect(test).toBe(production);
  });

  it('has exactly the two recorded development exceptions, and no script exception', async () => {
    const policy = directivesOf((await headersOf('development'))['content-security-policy'] ?? '');

    expect(policy['style-src']).toEqual(["'self'", "'unsafe-inline'"]);
    expect(policy['connect-src']).toEqual(["'self'", 'ws://localhost:*', 'ws://127.0.0.1:*']);
    expect(policy['script-src']).toEqual(["'self'"]);
    expect(policy['default-src']).toEqual(["'self'"]);
    expect(policy['frame-ancestors']).toEqual(["'none'"]);
    expect(policy).not.toHaveProperty('upgrade-insecure-requests');
  });

  it('does not let an unusual cloud name add directives or sources', () => {
    const policy = buildContentSecurityPolicy({
      environment: 'production',
      mediaCloudName: 'a b;script-src *',
    });

    expect(policy['img-src']).toEqual([
      "'self'",
      'https://res.cloudinary.com/a%20b%3Bscript-src%20*/',
    ]);
    expect(policy['script-src']).toEqual(["'self'"]);
  });
});

describe('security headers', () => {
  it('sends the full set in production', async () => {
    const headers = await headersOf('production');

    expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['x-permitted-cross-domain-policies']).toBe('none');
  });

  it('does not identify the framework', async () => {
    expect(await headersOf('production')).not.toHaveProperty('x-powered-by');
  });

  it('sends strict transport everywhere except development', async () => {
    expect((await headersOf('test'))['strict-transport-security']).toBeDefined();
    expect(await headersOf('development')).not.toHaveProperty('strict-transport-security');
  });

  it('is sent on every response, including a missing route', async () => {
    const response = await request(withProbe('production'))
      .get(`${API_BASE_PATH}/missing`)
      .set('X-Forwarded-Proto', 'https')
      .expect(404);

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
