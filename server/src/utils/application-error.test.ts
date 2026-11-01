import { describe, expect, it } from 'vitest';
import {
  ApplicationError,
  ERROR_DEFINITIONS,
  InternalError,
  MethodNotAllowedError,
  NotFoundError,
  PublishRequirementsNotMetError,
  ServiceUnavailableError,
  SignInTemporarilyBlockedError,
  TooManyRequestsError,
  ValidationFailedError,
} from '#utils/application-error';
import { ERROR_CASES, SAMPLE_DETAILS } from '../../test/error-cases.js';

describe('typed application errors', () => {
  it('has one class for every code in API_DESIGN.md Section 13.2, and no other', () => {
    expect(ERROR_CASES.map(({ code }) => code).sort()).toEqual(
      Object.keys(ERROR_DEFINITIONS).sort(),
    );
    expect(new Set(ERROR_CASES.map(({ code }) => code)).size).toBe(ERROR_CASES.length);
  });

  it.each(ERROR_CASES)('$code has status $status', ({ status, code, create }) => {
    const error = create();

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
  });

  it.each(ERROR_CASES)('$code is named after its class and has a plain message', ({ create }) => {
    const error = create();

    expect(error.name).toMatch(/^[A-Z][A-Za-z]+Error$/);
    expect(error.name).not.toBe('ApplicationError');
    expect(error.message).toMatch(/^[A-Z].*[.]$/);
    // Written for the person using the product: no technical vocabulary (API_DESIGN.md 13.3).
    expect(error.message).not.toMatch(/exception|stack|undefined|null|mongo|database|http|token/i);
  });

  it('uses the messages that the contract shows', () => {
    expect(new NotFoundError().message).toBe('We could not find what you were looking for.');
    expect(new ValidationFailedError(SAMPLE_DETAILS).message).toBe(
      'Please correct the highlighted fields.',
    );
    expect(ERROR_CASES.find(({ code }) => code === 'UNAUTHENTICATED')?.create().message).toBe(
      'Please sign in to continue.',
    );
    expect(ERROR_CASES.find(({ code }) => code === 'SESSION_EXPIRED')?.create().message).toBe(
      'Your session has ended. Please sign in again.',
    );
    expect(new InternalError().message).toBe('Something went wrong on our side. Please try again.');
  });

  it('logs each class at the level of ARCHITECTURE_DESIGN.md Section 12.2', () => {
    const levels = Object.fromEntries(
      ERROR_CASES.map(({ code, create }) => [code, create().logLevel]),
    );

    expect(levels).toMatchObject({
      VALIDATION_FAILED: 'debug',
      INVALID_QUERY_PARAMETER: 'debug',
      PUBLISH_REQUIREMENTS_NOT_MET: 'info',
      PUBLISHED_RECORD_INVALID: 'info',
      NOT_FOUND: 'info',
      DUPLICATE_SKILL: 'info',
      UNAUTHENTICATED: 'info',
      SESSION_EXPIRED: 'info',
      INVALID_CREDENTIALS: 'info',
      SIGN_IN_TEMPORARILY_BLOCKED: 'warn',
      TOO_MANY_REQUESTS: 'warn',
      FORBIDDEN: 'warn',
      MALFORMED_REQUEST: 'info',
      REQUEST_TOO_LARGE: 'info',
      UNSUPPORTED_CONTENT_TYPE: 'info',
      SUBMISSION_REJECTED: 'info',
      MEDIA_SERVICE_UNAVAILABLE: 'error',
      SERVICE_UNAVAILABLE: 'error',
      INTERNAL_ERROR: 'error',
    });
  });

  it('keeps the details it was given, in order', () => {
    const details = [
      { field: 'role', code: 'MISSING_FOR_PUBLISH', message: 'Describe your role.' },
      { field: 'outcome', code: 'MISSING_FOR_PUBLISH', message: 'Describe the outcome.' },
    ] as const;

    expect(new PublishRequirementsNotMetError(details).details).toEqual(details);
    expect(new NotFoundError().details).toBeUndefined();
  });

  it('can carry a message of its own, for wording that depends on the record', () => {
    const error = new PublishRequirementsNotMetError(SAMPLE_DETAILS, {
      message: 'This project cannot be published yet. Complete the missing items first.',
    });

    expect(error.message).toBe(
      'This project cannot be published yet. Complete the missing items first.',
    );
    expect(error.code).toBe('PUBLISH_REQUIREMENTS_NOT_MET');
  });

  it('keeps the underlying cause for the log, and the generic message for the client', () => {
    const cause = new Error('connection refused by db.internal:27017');

    const error = new ServiceUnavailableError({ cause });
    const internal = new InternalError({ cause });

    expect(error.cause).toBe(cause);
    expect(internal.cause).toBe(cause);
    expect(error.message).not.toContain('db.internal');
    expect(internal.message).not.toContain('db.internal');
  });

  it('states when to retry, in the header and, for a blocked sign-in, in the body', () => {
    expect(new TooManyRequestsError(30).headers).toEqual({ 'Retry-After': '30' });
    expect(new TooManyRequestsError(30).retryAfterSeconds).toBeUndefined();

    const blocked = new SignInTemporarilyBlockedError(900);
    expect(blocked.headers).toEqual({ 'Retry-After': '900' });
    expect(blocked.retryAfterSeconds).toBe(900);
  });

  it('lists the supported methods in the Allow header', () => {
    expect(new MethodNotAllowedError(['GET', 'HEAD', 'POST']).headers).toEqual({
      Allow: 'GET, HEAD, POST',
    });
  });
});
