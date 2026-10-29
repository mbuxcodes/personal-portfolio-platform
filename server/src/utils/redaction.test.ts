import { describe, expect, it } from 'vitest';
import { createRedactor, isSensitiveName, REDACTED } from '#utils/redaction';

describe('isSensitiveName', () => {
  it.each([
    'authorization',
    'Authorization',
    'Proxy-Authorization',
    'cookie',
    'Set-Cookie',
    'set_cookie',
    'cookies',
    'password',
    'PASSWORD',
    'currentPassword',
    'newPassword',
    'passwordHash',
    'token',
    'accessToken',
    'refresh_token',
    'secret',
    'ACCESS_TOKEN_SECRET',
    'apiKey',
    'x-api-key',
    'credentials',
    'privateKey',
    'session',
    'sessionsValidFrom',
    'email',
    'senderEmail',
    'senderName',
    'x-forwarded-for',
    'body',
    'requestBody',
    'content',
    'messageText',
    'articleBody',
    'subject',
    'payload',
    'auditPayload',
    'ip',
    'ipAddress',
    'remoteAddress',
  ])('treats %s as sensitive', (name) => {
    expect(isSensitiveName(name)).toBe(true);
  });

  it.each([
    'requestId',
    'method',
    'route',
    'status',
    'durationMs',
    'event',
    'level',
    'time',
    'name',
    'message',
    'stack',
    'category',
    'action',
    'resourceType',
    'resourceId',
    'port',
    'environment',
    'variables',
  ])('keeps %s', (name) => {
    expect(isSensitiveName(name)).toBe(false);
  });
});

describe('createRedactor', () => {
  const redact = createRedactor();

  it('replaces the value of a sensitive field and keeps the rest', () => {
    expect(redact({ method: 'POST', password: 'PASSWORD_CANARY', status: 200 })).toEqual({
      method: 'POST',
      password: REDACTED,
      status: 200,
    });
  });

  it('applies the rules at any depth, including inside arrays', () => {
    const result = redact({
      request: { headers: { authorization: 'Bearer AUTH_CANARY', accept: 'text/html' } },
      attempts: [{ user: { passwordHash: 'HASH_CANARY' } }, { ok: true }],
    });

    expect(result).toEqual({
      request: { headers: { authorization: REDACTED, accept: 'text/html' } },
      attempts: [{ user: { passwordHash: REDACTED } }, { ok: true }],
    });
  });

  it('redacts headers whatever their capitalization', () => {
    const result = redact({
      Authorization: 'AUTH_CANARY',
      COOKIE: 'COOKIE_CANARY',
      'Set-Cookie': ['COOKIE_CANARY'],
      'X-Api-Key': 'SUPER_SECRET_123',
    });

    expect(JSON.stringify(result)).not.toMatch(/CANARY|SUPER_SECRET/);
  });

  it('redacts message content, sender details, and article bodies', () => {
    const result = redact({
      messageText: 'MESSAGE_CANARY',
      senderName: 'SENDER_CANARY',
      senderEmail: 'sender@canary.test',
      body: 'ARTICLE_CANARY',
    });

    expect(JSON.stringify(result)).not.toMatch(/CANARY|canary/);
  });

  it('does not change what it is given', () => {
    const input = { password: 'PASSWORD_CANARY', nested: { token: 'TOKEN_CANARY' } };

    redact(input);

    expect(input).toEqual({ password: 'PASSWORD_CANARY', nested: { token: 'TOKEN_CANARY' } });
  });

  it('keeps values that are not text or objects as they are', () => {
    expect(redact({ count: 3, ok: true, nothing: null, missing: undefined })).toEqual({
      count: 3,
      ok: true,
      nothing: null,
      missing: undefined,
    });
  });

  it('describes an Error by name, message, and stack, and applies the rules inside it', () => {
    const error = Object.assign(new Error('failed'), { password: 'PASSWORD_CANARY' });

    const result = redact({ error }) as { error: Record<string, unknown> };

    expect(result.error).toMatchObject({ name: 'Error', message: 'failed' });
    expect(JSON.stringify(result)).not.toContain('PASSWORD_CANARY');
  });

  it('writes a date as its text', () => {
    expect(redact({ at: new Date('2026-10-27T10:00:00.000Z') })).toEqual({
      at: '2026-10-27T10:00:00.000Z',
    });
  });

  it('survives an object that refers to itself', () => {
    const loop: Record<string, unknown> = { name: 'loop' };
    loop.self = loop;

    expect(redact(loop)).toEqual({ name: 'loop', self: '[Circular]' });
  });

  it('does not call a shared, non-circular object circular', () => {
    const shared = { value: 1 };

    expect(redact({ a: shared, b: shared })).toEqual({ a: { value: 1 }, b: { value: 1 } });
  });

  it('stops at a fixed depth', () => {
    let deep: Record<string, unknown> = { leaf: 'end' };
    for (let level = 0; level < 20; level += 1) deep = { child: deep };

    expect(JSON.stringify(redact(deep))).toContain('[Truncated]');
  });
});

describe('createRedactor with secret values', () => {
  const redact = createRedactor({
    secrets: ['SUPER_SECRET_123', 'mongodb://admin:DB_PASSWORD_CANARY@host/db'],
  });

  it('removes a secret from any text, even under a harmless field name', () => {
    const result = redact({
      message: 'Could not connect with SUPER_SECRET_123 today',
      detail: { note: 'x SUPER_SECRET_123 y SUPER_SECRET_123 z' },
    });

    expect(JSON.stringify(result)).not.toContain('SUPER_SECRET_123');
    expect(result).toEqual({
      message: `Could not connect with ${REDACTED} today`,
      detail: { note: `x ${REDACTED} y ${REDACTED} z` },
    });
  });

  it('removes a connection string from an error message', () => {
    const error = new Error('connect failed: mongodb://admin:DB_PASSWORD_CANARY@host/db');

    const result = redact({ error });

    expect(JSON.stringify(result)).not.toMatch(/DB_PASSWORD_CANARY|mongodb:\/\//);
  });

  it('removes a secret from inside an array', () => {
    expect(JSON.stringify(redact(['ok', 'has SUPER_SECRET_123']))).not.toContain('SUPER_SECRET');
  });

  it('removes the longer secret whole when one secret contains another', () => {
    const nested = createRedactor({ secrets: ['abcd', 'abcdefgh'] });

    expect(nested('value abcdefgh end')).toBe(`value ${REDACTED} end`);
  });

  it('ignores an empty secret instead of corrupting every text', () => {
    const withEmpty = createRedactor({ secrets: ['', 'SUPER_SECRET_123'] });

    expect(withEmpty('plain text')).toBe('plain text');
  });
});
