import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import {
  SERVER_ERROR_CODES,
  type ApiError,
  type ApiErrorCode,
  type ApiFieldDetail,
  type ServerErrorCode,
} from '../types/errors';

/*
 * Every failure becomes one `ApiError` here (ARCHITECTURE_DESIGN.md Section 6.5, API_DESIGN.md
 * Section 8.3). Features never see a `FetchBaseQueryError`, a response body, or an exception.
 *
 * The wording below is written for the person, not for developers (API_DESIGN.md Section 13.3,
 * FR-ERR-001). Technical text from the browser ("Failed to fetch") is never passed on, because it
 * would reveal internals and mean nothing to a visitor (FR-ERR-006).
 */

export const NETWORK_ERROR_MESSAGE =
  'We could not reach the server. Check your connection and try again.';
export const INVALID_RESPONSE_MESSAGE =
  'We received an unexpected response from the server. Please try again.';
export const SERVER_TROUBLE_MESSAGE = 'Something went wrong on our side. Please try again.';
export const UNKNOWN_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const SERVER_ERROR_CODE_SET: ReadonlySet<string> = new Set(SERVER_ERROR_CODES);

function isServerErrorCode(value: unknown): value is ServerErrorCode {
  return typeof value === 'string' && SERVER_ERROR_CODE_SET.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** True for a value that is already an `ApiError`, so normalizing twice changes nothing. */
export function isApiError(value: unknown): value is ApiError {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    Array.isArray(value.details) &&
    (value.requestId === null || typeof value.requestId === 'string')
  );
}

function isFetchBaseQueryError(value: unknown): value is FetchBaseQueryError {
  return isRecord(value) && 'status' in value;
}

/** Keeps only the details that have the contract's three text fields. Anything else is dropped. */
function readDetails(value: unknown): ApiFieldDetail[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const details: ApiFieldDetail[] = [];
  for (const item of value as unknown[]) {
    if (
      isRecord(item) &&
      typeof item.field === 'string' &&
      typeof item.code === 'string' &&
      typeof item.message === 'string'
    ) {
      details.push({ field: item.field, code: item.code, message: item.message });
    }
  }
  return details;
}

/** The wording for a failure whose body gave none, chosen from the HTTP status. */
function messageForStatus(status: number): string {
  return status >= 500 ? SERVER_TROUBLE_MESSAGE : UNKNOWN_ERROR_MESSAGE;
}

function clientError(code: ApiErrorCode, message: string): ApiError {
  return { code, message, details: [], requestId: null };
}

/** An HTTP response with a status. The body may or may not follow the contract. */
function fromResponse(status: number, data: unknown): ApiError {
  const body = isRecord(data) && isRecord(data.error) ? data.error : null;

  if (body === null) {
    // The server answered, but not in the contract's error shape (for example a plain proxy reply).
    return clientError(
      status >= 500 ? 'INVALID_RESPONSE' : 'UNKNOWN_ERROR',
      messageForStatus(status),
    );
  }

  return {
    // A code this client does not know is not a code it can act on, so it is treated as unknown.
    code: isServerErrorCode(body.code) ? body.code : 'UNKNOWN_ERROR',
    message: isNonEmptyString(body.message) ? body.message : messageForStatus(status),
    details: readDetails(body.details),
    requestId: isNonEmptyString(body.requestId) ? body.requestId : null,
  };
}

/**
 * Turns anything an API call can fail with into an `ApiError`. It never throws.
 *
 * | Input                                      | Result code        |
 * | ------------------------------------------ | ------------------ |
 * | contract error body, any status            | the server's code  |
 * | `FETCH_ERROR`, `TIMEOUT_ERROR` (no answer) | `NETWORK_ERROR`    |
 * | `PARSING_ERROR` (answer was not JSON)      | `INVALID_RESPONSE` |
 * | a body that is not the contract's shape    | `UNKNOWN_ERROR` / `INVALID_RESPONSE` |
 * | a thrown exception, or anything else       | `UNKNOWN_ERROR`    |
 */
export function normalizeError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (isFetchBaseQueryError(error)) {
    switch (error.status) {
      case 'FETCH_ERROR':
      case 'TIMEOUT_ERROR':
        return clientError('NETWORK_ERROR', NETWORK_ERROR_MESSAGE);
      case 'PARSING_ERROR':
        return clientError('INVALID_RESPONSE', INVALID_RESPONSE_MESSAGE);
      case 'CUSTOM_ERROR':
        return clientError('UNKNOWN_ERROR', UNKNOWN_ERROR_MESSAGE);
      default:
        return fromResponse(error.status, error.data);
    }
  }

  return clientError('UNKNOWN_ERROR', UNKNOWN_ERROR_MESSAGE);
}
