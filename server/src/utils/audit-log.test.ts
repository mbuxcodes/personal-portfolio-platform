import { describe, expect, it } from 'vitest';
import { AUDIT_EVENT_TYPES, createAuditLog } from '#utils/audit-log';
import { createMemoryLogger } from '../../test/memory-logger.js';

function setup() {
  const memory = createMemoryLogger();
  const requestLogger = memory.logger.child({ requestId: 'req_audit' });
  return { ...memory, audit: createAuditLog(requestLogger) };
}

describe('audit log', () => {
  it('uses the event types of the security and audit events', () => {
    expect(AUDIT_EVENT_TYPES).toEqual({
      signInSucceeded: 'sign_in_succeeded',
      signInFailed: 'sign_in_failed',
      signInBlocked: 'sign_in_blocked',
      sessionEnded: 'session_ended',
      passwordChanged: 'password_changed',
      adminChange: 'admin_change',
    });
  });

  it('logs a successful sign-in at info level', () => {
    const { audit, entries } = setup();

    audit.signInSucceeded();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: 'info',
      event: 'sign_in_succeeded',
      category: 'security',
      requestId: 'req_audit',
    });
  });

  it('logs a failed sign-in at warning level, with no credential field', () => {
    const { audit, entries } = setup();

    audit.signInFailed();

    expect(entries[0]).toMatchObject({
      level: 'warn',
      event: 'sign_in_failed',
      category: 'security',
    });
    expect(Object.keys(entries[0] ?? {}).sort()).toEqual([
      'category',
      'event',
      'level',
      'requestId',
      'time',
    ]);
  });

  it('logs a block at warning level, with how long it lasts when known', () => {
    const { audit, entries } = setup();

    audit.signInBlocked({ retryAfterSeconds: 900 });
    audit.signInBlocked();

    expect(entries[0]).toMatchObject({
      level: 'warn',
      event: 'sign_in_blocked',
      retryAfterSeconds: 900,
    });
    expect(entries[1]).not.toHaveProperty('retryAfterSeconds');
  });

  it('logs the end of a session with its reason', () => {
    const { audit, entries } = setup();

    audit.sessionEnded({ reason: 'expired' });

    expect(entries[0]).toMatchObject({
      level: 'info',
      event: 'session_ended',
      category: 'security',
      reason: 'expired',
    });
  });

  it('logs a password change at info level', () => {
    const { audit, entries } = setup();

    audit.passwordChanged();

    expect(entries[0]).toMatchObject({
      level: 'info',
      event: 'password_changed',
      category: 'security',
    });
  });

  it('logs an admin change with the action, the resource type, and the identifier', () => {
    const { audit, entries } = setup();

    audit.adminChange({
      action: 'publish',
      resourceType: 'article',
      resourceId: '65a1b2c3d4e5f60718293a4b',
    });

    expect(entries[0]).toEqual({
      level: 'info',
      time: expect.any(String),
      event: 'admin_change',
      category: 'audit',
      requestId: 'req_audit',
      action: 'publish',
      resourceType: 'article',
      resourceId: '65a1b2c3d4e5f60718293a4b',
    });
  });

  it('writes only the fields it is designed to write, even when more are passed in', () => {
    const { audit, output } = setup();

    audit.adminChange({
      action: 'update',
      resourceType: 'project',
      resourceId: 'abc123',
      // Not part of the contract: a caller that bypasses the types still cannot log these.
      ...({ body: 'BODY_CANARY', password: 'PASSWORD_CANARY', title: 'TITLE_CANARY' } as object),
    });
    audit.signInFailed(...([{ password: 'PASSWORD_CANARY' }] as unknown as []));
    audit.sessionEnded({ reason: 'sign_out', ...({ token: 'TOKEN_CANARY' } as object) });

    expect(output()).not.toMatch(/CANARY/);
  });

  it('never writes credentials when a caller tries to log them through a security event', () => {
    const { audit, output } = setup();

    audit.signInBlocked({ retryAfterSeconds: 60, ...({ password: 'PASSWORD_CANARY' } as object) });

    expect(output()).not.toContain('PASSWORD_CANARY');
  });
});
