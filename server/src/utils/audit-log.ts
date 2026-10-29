import type { Logger } from '#utils/logger';

/**
 * The event types for security and audit entries (ARCHITECTURE_DESIGN.md Sections 12.4 and 15.4).
 * They are the `event` of the entry, so entries can be found by type.
 */
export const AUDIT_EVENT_TYPES = {
  signInSucceeded: 'sign_in_succeeded',
  signInFailed: 'sign_in_failed',
  signInBlocked: 'sign_in_blocked',
  sessionEnded: 'session_ended',
  passwordChanged: 'password_changed',
  adminChange: 'admin_change',
} as const;

export type AdminAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish';

export type SessionEndReason = 'sign_out' | 'expired' | 'password_changed' | 'revoked';

export interface AdminChange {
  action: AdminAction;
  /** A stable lower-case noun, such as `project` or `article`. */
  resourceType: string;
  /** The identifier of the record. Never its content. */
  resourceId: string;
}

/**
 * Logging helpers for security events and admin changes. They are the only place these entries are
 * written, and they accept only the fields below: no credentials, no submitted values, and no
 * record content can be passed in. The request identifier comes from the logger they are given,
 * which should be the request's own logger (`getRequestContext(response).logger`).
 */
export interface AuditLog {
  signInSucceeded(): void;
  signInFailed(): void;
  signInBlocked(details?: { retryAfterSeconds?: number }): void;
  sessionEnded(details: { reason: SessionEndReason }): void;
  passwordChanged(): void;
  adminChange(change: AdminChange): void;
}

export function createAuditLog(logger: Logger): AuditLog {
  return {
    signInSucceeded: () => logger.info(AUDIT_EVENT_TYPES.signInSucceeded, { category: 'security' }),

    signInFailed: () => logger.warn(AUDIT_EVENT_TYPES.signInFailed, { category: 'security' }),

    signInBlocked: (details) =>
      logger.warn(AUDIT_EVENT_TYPES.signInBlocked, {
        category: 'security',
        retryAfterSeconds: details?.retryAfterSeconds,
      }),

    sessionEnded: ({ reason }) =>
      logger.info(AUDIT_EVENT_TYPES.sessionEnded, { category: 'security', reason }),

    passwordChanged: () => logger.info(AUDIT_EVENT_TYPES.passwordChanged, { category: 'security' }),

    adminChange: ({ action, resourceType, resourceId }) =>
      logger.info(AUDIT_EVENT_TYPES.adminChange, {
        category: 'audit',
        action,
        resourceType,
        resourceId,
      }),
  };
}
