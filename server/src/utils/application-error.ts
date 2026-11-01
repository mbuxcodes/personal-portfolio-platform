import type { LogLevel } from '#utils/logger';

/** The detail codes of API_DESIGN.md Section 8.4. Each names the exact problem with one field. */
export const VALIDATION_DETAIL_CODES = [
  'REQUIRED',
  'MISSING_FOR_PUBLISH',
  'TOO_SHORT',
  'TOO_LONG',
  'LIST_TOO_LONG',
  'INVALID_FORMAT',
  'INVALID_URL',
  'INVALID_DATE',
  'END_BEFORE_START',
  'NOT_ALLOWED_VALUE',
  'READ_ONLY',
  'UNKNOWN_FIELD',
  'DUPLICATE',
  'INCORRECT',
  'PASSWORD_TOO_WEAK',
  'PASSWORD_UNCHANGED',
] as const;

export type ValidationDetailCode = (typeof VALIDATION_DETAIL_CODES)[number];

/** One problem with one field. `field` is the request field name, such as `technologies[2]`. */
export interface ErrorDetail {
  field: string;
  code: ValidationDetailCode;
  message: string;
}

export interface ErrorDefinition {
  readonly status: number;
  readonly code: string;
  /** Plain language for the person using the product (API_DESIGN.md Section 13.3). */
  readonly message: string;
  /** How serious a failure of this kind is in the logs (ARCHITECTURE_DESIGN.md Section 12.2). */
  readonly logLevel: LogLevel;
}

/**
 * Every status and code of API_DESIGN.md Section 13.2, with its default message and log level.
 * This is the one place where they are written. The classes below only choose from it.
 */
export const ERROR_DEFINITIONS = {
  MALFORMED_REQUEST: {
    status: 400,
    code: 'MALFORMED_REQUEST',
    message: 'The request could not be read. Please check it and try again.',
    logLevel: 'info',
  },
  SUBMISSION_REJECTED: {
    status: 400,
    code: 'SUBMISSION_REJECTED',
    message: 'Your message could not be sent. Please try again later.',
    logLevel: 'info',
  },
  UNAUTHENTICATED: {
    status: 401,
    code: 'UNAUTHENTICATED',
    message: 'Please sign in to continue.',
    logLevel: 'info',
  },
  SESSION_EXPIRED: {
    status: 401,
    code: 'SESSION_EXPIRED',
    message: 'Your session has ended. Please sign in again.',
    logLevel: 'info',
  },
  INVALID_CREDENTIALS: {
    status: 401,
    code: 'INVALID_CREDENTIALS',
    message: 'The email or password is incorrect.',
    logLevel: 'info',
  },
  FORBIDDEN: {
    status: 403,
    code: 'FORBIDDEN',
    message: 'This request could not be completed.',
    logLevel: 'warn',
  },
  NOT_FOUND: {
    status: 404,
    code: 'NOT_FOUND',
    message: 'We could not find what you were looking for.',
    logLevel: 'info',
  },
  METHOD_NOT_ALLOWED: {
    status: 405,
    code: 'METHOD_NOT_ALLOWED',
    message: 'This action is not available here.',
    logLevel: 'info',
  },
  DUPLICATE_SKILL: {
    status: 409,
    code: 'DUPLICATE_SKILL',
    message: 'This skill already exists.',
    logLevel: 'info',
  },
  REQUEST_TOO_LARGE: {
    status: 413,
    code: 'REQUEST_TOO_LARGE',
    message: 'The request is too large. Please send less data and try again.',
    logLevel: 'info',
  },
  IMAGE_TOO_LARGE: {
    status: 413,
    code: 'IMAGE_TOO_LARGE',
    message: 'This image is too large. Please choose a smaller one.',
    logLevel: 'info',
  },
  UNSUPPORTED_CONTENT_TYPE: {
    status: 415,
    code: 'UNSUPPORTED_CONTENT_TYPE',
    message: 'This kind of content is not supported. Please send JSON or a form with a file.',
    logLevel: 'info',
  },
  UNSUPPORTED_IMAGE_TYPE: {
    status: 415,
    code: 'UNSUPPORTED_IMAGE_TYPE',
    message: 'This image type is not supported. Please use a JPEG, PNG, or WebP image.',
    logLevel: 'info',
  },
  VALIDATION_FAILED: {
    status: 422,
    code: 'VALIDATION_FAILED',
    message: 'Please correct the highlighted fields.',
    logLevel: 'debug',
  },
  PUBLISH_REQUIREMENTS_NOT_MET: {
    status: 422,
    code: 'PUBLISH_REQUIREMENTS_NOT_MET',
    message: 'This cannot be published yet. Complete the missing items first.',
    logLevel: 'info',
  },
  PUBLISHED_RECORD_INVALID: {
    status: 422,
    code: 'PUBLISHED_RECORD_INVALID',
    message: 'This change would leave a published item incomplete.',
    logLevel: 'info',
  },
  INVALID_QUERY_PARAMETER: {
    status: 422,
    code: 'INVALID_QUERY_PARAMETER',
    message: 'One or more query parameters are not valid.',
    logLevel: 'debug',
  },
  IMAGE_LIMIT_REACHED: {
    status: 422,
    code: 'IMAGE_LIMIT_REACHED',
    message: 'This project already has the maximum number of images.',
    logLevel: 'info',
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please wait a moment and try again.',
    logLevel: 'warn',
  },
  SIGN_IN_TEMPORARILY_BLOCKED: {
    status: 429,
    code: 'SIGN_IN_TEMPORARILY_BLOCKED',
    message: 'Too many failed attempts. Please try again later.',
    logLevel: 'warn',
  },
  INTERNAL_ERROR: {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on our side. Please try again.',
    logLevel: 'error',
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'The service is temporarily unable to complete this request. Please try again.',
    logLevel: 'error',
  },
  MEDIA_SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'MEDIA_SERVICE_UNAVAILABLE',
    message: 'The image could not be stored right now. Please try again.',
    logLevel: 'error',
  },
} as const satisfies Record<string, ErrorDefinition>;

export type ErrorCode = keyof typeof ERROR_DEFINITIONS;

/** What a caller may add to any error. Nothing here ever reaches the client except as listed. */
export interface ApplicationErrorOptions {
  /** Replaces the default message, for the few errors whose wording depends on the record. */
  message?: string;
  /** The underlying failure. It is logged and never sent to the client. */
  cause?: unknown;
}

export interface ApplicationErrorInit extends ApplicationErrorOptions {
  details?: readonly ErrorDetail[];
  retryAfterSeconds?: number;
  headers?: Readonly<Record<string, string>>;
}

/**
 * The base of every failure that is raised on purpose (ADR-19). A layer that detects a problem
 * throws one of the classes below. It travels upward unchanged and the central error handler turns
 * it into the standard response (API_DESIGN.md Section 8.3). Nothing else builds an error response.
 *
 * It has the same fields as a `Rejection`, so `sendRejection` can send it as it is.
 */
export class ApplicationError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly logLevel: LogLevel;
  readonly details?: readonly ErrorDetail[];
  readonly retryAfterSeconds?: number;
  readonly headers?: Readonly<Record<string, string>>;

  constructor(definition: ErrorDefinition & { code: ErrorCode }, init: ApplicationErrorInit = {}) {
    super(init.message ?? definition.message, { cause: init.cause });
    this.name = new.target.name;
    this.status = definition.status;
    this.code = definition.code;
    this.logLevel = definition.logLevel;
    this.details = init.details;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.headers = init.headers;
  }
}

type Options = ApplicationErrorOptions;

export class MalformedRequestError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.MALFORMED_REQUEST, options);
  }
}

export class SubmissionRejectedError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.SUBMISSION_REJECTED, options);
  }
}

export class UnauthenticatedError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.UNAUTHENTICATED, options);
  }
}

export class SessionExpiredError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.SESSION_EXPIRED, options);
  }
}

export class InvalidCredentialsError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.INVALID_CREDENTIALS, options);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.FORBIDDEN, options);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.NOT_FOUND, options);
  }
}

/** Sends the `Allow` header that HTTP requires with a 405, listing what the address does support. */
export class MethodNotAllowedError extends ApplicationError {
  constructor(allowedMethods: readonly string[], options?: Options) {
    super(ERROR_DEFINITIONS.METHOD_NOT_ALLOWED, {
      ...options,
      headers: { Allow: allowedMethods.join(', ') },
    });
  }
}

/** `details` may name the field that clashed, with the detail code `DUPLICATE`. */
export class DuplicateSkillError extends ApplicationError {
  constructor(details?: readonly ErrorDetail[], options?: Options) {
    super(ERROR_DEFINITIONS.DUPLICATE_SKILL, { ...options, details });
  }
}

export class RequestTooLargeError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.REQUEST_TOO_LARGE, options);
  }
}

export class ImageTooLargeError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.IMAGE_TOO_LARGE, options);
  }
}

export class UnsupportedContentTypeError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.UNSUPPORTED_CONTENT_TYPE, options);
  }
}

export class UnsupportedImageTypeError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.UNSUPPORTED_IMAGE_TYPE, options);
  }
}

export class ValidationFailedError extends ApplicationError {
  constructor(details: readonly ErrorDetail[], options?: Options) {
    super(ERROR_DEFINITIONS.VALIDATION_FAILED, { ...options, details });
  }
}

/** Every missing item is named, each with the detail code `MISSING_FOR_PUBLISH`. */
export class PublishRequirementsNotMetError extends ApplicationError {
  constructor(details: readonly ErrorDetail[], options?: Options) {
    super(ERROR_DEFINITIONS.PUBLISH_REQUIREMENTS_NOT_MET, { ...options, details });
  }
}

export class PublishedRecordInvalidError extends ApplicationError {
  constructor(details?: readonly ErrorDetail[], options?: Options) {
    super(ERROR_DEFINITIONS.PUBLISHED_RECORD_INVALID, { ...options, details });
  }
}

/** `details` names each parameter that is not valid, by the parameter's own name. */
export class InvalidQueryParameterError extends ApplicationError {
  constructor(details: readonly ErrorDetail[], options?: Options) {
    super(ERROR_DEFINITIONS.INVALID_QUERY_PARAMETER, { ...options, details });
  }
}

export class ImageLimitReachedError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.IMAGE_LIMIT_REACHED, options);
  }
}

/** Sends `Retry-After` (API_DESIGN.md Section 15.1). */
export class TooManyRequestsError extends ApplicationError {
  constructor(retryAfterSeconds: number, options?: Options) {
    super(ERROR_DEFINITIONS.TOO_MANY_REQUESTS, {
      ...options,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    });
  }
}

/** Sends `Retry-After` and states the same time in the body, as in API_DESIGN.md Section 5.3. */
export class SignInTemporarilyBlockedError extends ApplicationError {
  constructor(retryAfterSeconds: number, options?: Options) {
    super(ERROR_DEFINITIONS.SIGN_IN_TEMPORARILY_BLOCKED, {
      ...options,
      retryAfterSeconds,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    });
  }
}

/** The client always gets the generic message. Pass what went wrong as `cause`, so it is logged. */
export class InternalError extends ApplicationError {
  constructor(options?: Pick<Options, 'cause'>) {
    super(ERROR_DEFINITIONS.INTERNAL_ERROR, { cause: options?.cause });
  }
}

export class ServiceUnavailableError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.SERVICE_UNAVAILABLE, options);
  }
}

export class MediaServiceUnavailableError extends ApplicationError {
  constructor(options?: Options) {
    super(ERROR_DEFINITIONS.MEDIA_SERVICE_UNAVAILABLE, options);
  }
}
