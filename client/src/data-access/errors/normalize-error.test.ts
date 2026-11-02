import { describe, expect, it } from 'vitest';
import { errorFixtures, notFoundError, validationFailedError } from '../fixtures';
import {
  INVALID_RESPONSE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  SERVER_TROUBLE_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
  isApiError,
  normalizeError,
} from './normalize-error';

describe('normalizeError: contract error bodies', () => {
  it.each(errorFixtures)('turns the $name example into the one client shape', (fixture) => {
    const normalized = normalizeError({ status: fixture.status, data: fixture.body });
    const { error } = fixture.body;

    expect(normalized).toEqual({
      code: error.code,
      message: error.message,
      details: 'details' in error ? error.details : [],
      requestId: error.requestId,
    });
  });

  it('gives exactly the four documented fields and nothing else', () => {
    const normalized = normalizeError({ status: 404, data: notFoundError });

    expect(Object.keys(normalized).sort()).toEqual(['code', 'details', 'message', 'requestId']);
  });

  it('keeps field names with list indexes and nesting as the server sent them', () => {
    const normalized = normalizeError({ status: 422, data: validationFailedError });

    expect(normalized.details.map((detail) => detail.field)).toEqual([
      'roleTitle',
      'endDate',
      'technologies[2]',
    ]);
  });

  it('treats a code it does not know as UNKNOWN_ERROR but keeps the message and request id', () => {
    const normalized = normalizeError({
      status: 418,
      data: { error: { code: 'TEAPOT', message: 'Short and stout.', requestId: 'req_1' } },
    });

    expect(normalized).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'Short and stout.',
      details: [],
      requestId: 'req_1',
    });
  });

  it('drops details that are not made of three text fields', () => {
    const normalized = normalizeError({
      status: 422,
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Fix it.',
          requestId: 'req_2',
          details: [
            { field: 'title', code: 'REQUIRED', message: 'Title is required.' },
            { field: 'broken' },
            'text',
            null,
            { field: 1, code: 'X', message: 'y' },
          ],
        },
      },
    });

    expect(normalized.details).toEqual([
      { field: 'title', code: 'REQUIRED', message: 'Title is required.' },
    ]);
  });

  it('replaces a missing or blank message and request id', () => {
    const normalized = normalizeError({
      status: 500,
      data: { error: { code: 'INTERNAL_ERROR', message: '   ', requestId: 42 } },
    });

    expect(normalized.message).toBe(SERVER_TROUBLE_MESSAGE);
    expect(normalized.requestId).toBeNull();
    expect(normalized.details).toEqual([]);
  });
});

describe('normalizeError: failures with no contract body', () => {
  it('turns a network failure into a friendly NETWORK_ERROR (FR-ERR-007)', () => {
    const normalized = normalizeError({
      status: 'FETCH_ERROR',
      error: 'TypeError: Failed to fetch',
    });

    expect(normalized).toEqual({
      code: 'NETWORK_ERROR',
      message: NETWORK_ERROR_MESSAGE,
      details: [],
      requestId: null,
    });
  });

  it('never passes the browser text on to the person (FR-ERR-006)', () => {
    const normalized = normalizeError({
      status: 'FETCH_ERROR',
      error: 'TypeError: NetworkError when attempting to fetch resource.',
    });

    expect(normalized.message).not.toMatch(/TypeError|fetch resource/i);
  });

  it('treats a timeout like a network failure', () => {
    expect(normalizeError({ status: 'TIMEOUT_ERROR', error: 'timed out' }).code).toBe(
      'NETWORK_ERROR',
    );
  });

  it('turns an answer that is not JSON into INVALID_RESPONSE', () => {
    const normalized = normalizeError({
      status: 'PARSING_ERROR',
      originalStatus: 502,
      data: '<html>Bad gateway</html>',
      error: 'SyntaxError: Unexpected token <',
    });

    expect(normalized).toEqual({
      code: 'INVALID_RESPONSE',
      message: INVALID_RESPONSE_MESSAGE,
      details: [],
      requestId: null,
    });
  });

  it('gives a server fault with no contract body the server-trouble wording', () => {
    const normalized = normalizeError({ status: 502, data: { unexpected: true } });

    expect(normalized.code).toBe('INVALID_RESPONSE');
    expect(normalized.message).toBe(SERVER_TROUBLE_MESSAGE);
  });

  it('gives a client-side status with no contract body UNKNOWN_ERROR', () => {
    expect(normalizeError({ status: 400, data: 'nope' })).toEqual({
      code: 'UNKNOWN_ERROR',
      message: UNKNOWN_ERROR_MESSAGE,
      details: [],
      requestId: null,
    });
  });

  it.each([
    ['an Error', new Error('database password is hunter2')],
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['a serialized error', { name: 'Error', message: 'secret internals' }],
  ])('turns %s into UNKNOWN_ERROR without leaking its text', (_label, input) => {
    const normalized = normalizeError(input);

    expect(normalized.code).toBe('UNKNOWN_ERROR');
    expect(normalized.message).toBe(UNKNOWN_ERROR_MESSAGE);
    expect(JSON.stringify(normalized)).not.toMatch(/hunter2|secret|boom/);
  });

  it('is idempotent: an ApiError is returned unchanged', () => {
    const once = normalizeError({ status: 404, data: notFoundError });

    expect(normalizeError(once)).toBe(once);
  });
});

describe('isApiError', () => {
  it('accepts the normalized shape only', () => {
    expect(isApiError(normalizeError(undefined))).toBe(true);
    expect(isApiError({ code: 'X', message: 'y' })).toBe(false);
    expect(isApiError(notFoundError)).toBe(false);
    expect(isApiError({ status: 404, data: notFoundError })).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});
