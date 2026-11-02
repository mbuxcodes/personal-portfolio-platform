/*
 * Error shapes. Source: API_DESIGN.md Sections 8.3 to 8.7 and 13.
 *
 * Two shapes live here, and they are not the same thing:
 *
 * - `ErrorResponse` is what the server SENDS (the wire body).
 * - `ApiError` is what every feature RECEIVES, after normalization. Features never see the wire
 *   body, a `FetchBaseQueryError`, or a thrown exception.
 */

/** Every `error.code` the server can send (Section 13.2). */
export const SERVER_ERROR_CODES = [
  'MALFORMED_REQUEST',
  'SUBMISSION_REJECTED',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'DUPLICATE_SKILL',
  'REQUEST_TOO_LARGE',
  'IMAGE_TOO_LARGE',
  'UNSUPPORTED_CONTENT_TYPE',
  'UNSUPPORTED_IMAGE_TYPE',
  'VALIDATION_FAILED',
  'PUBLISH_REQUIREMENTS_NOT_MET',
  'PUBLISHED_RECORD_INVALID',
  'INVALID_QUERY_PARAMETER',
  'IMAGE_LIMIT_REACHED',
  'TOO_MANY_REQUESTS',
  'SIGN_IN_TEMPORARILY_BLOCKED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'MEDIA_SERVICE_UNAVAILABLE',
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];

/**
 * Codes the CLIENT makes up for failures that never produced a contract error body. They are
 * never sent by the server.
 *
 * - `NETWORK_ERROR`: the server could not be reached, or the request timed out (FR-ERR-007).
 * - `INVALID_RESPONSE`: something answered, but not with a readable API response (for example an
 *   error page from a proxy).
 * - `UNKNOWN_ERROR`: anything else, including a server code this client does not know.
 */
export const CLIENT_ERROR_CODES = ['NETWORK_ERROR', 'INVALID_RESPONSE', 'UNKNOWN_ERROR'] as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

export type ApiErrorCode = ServerErrorCode | ClientErrorCode;

/**
 * One problem with one request field (Section 8.3). `field` is the request field name. List items
 * use an index, `technologies[2]`, and nested fields use dots, `professionalLinks[0].address`
 * (Section 8.4). `code` is informational, so it stays plain text: a detail code added to the
 * contract later must not break an old client.
 */
export interface ApiFieldDetail {
  field: string;
  code: string;
  message: string;
}

/** The body of an error response, exactly as the server sends it (Section 8.3). */
export interface ErrorResponse {
  error: {
    code: ServerErrorCode;
    message: string;
    details?: ApiFieldDetail[];
    requestId: string;
    /** Sent with `SIGN_IN_TEMPORARILY_BLOCKED` (Section 5.3). */
    retryAfterSeconds?: number;
  };
}

/**
 * The one error shape that every feature receives (M3.4).
 *
 * - `code`: decide behavior from this, never from `message`.
 * - `message`: plain language for the person. It is safe to display (FR-ERR-001).
 * - `details`: field problems, `[]` when there are none.
 * - `requestId`: the server's reference for tracing, or `null` when the failure never reached
 *   the server.
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details: readonly ApiFieldDetail[];
  requestId: string | null;
}
