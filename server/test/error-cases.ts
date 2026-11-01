import {
  DuplicateSkillError,
  ForbiddenError,
  ImageLimitReachedError,
  ImageTooLargeError,
  InternalError,
  InvalidCredentialsError,
  InvalidQueryParameterError,
  MalformedRequestError,
  MediaServiceUnavailableError,
  MethodNotAllowedError,
  NotFoundError,
  PublishedRecordInvalidError,
  PublishRequirementsNotMetError,
  RequestTooLargeError,
  ServiceUnavailableError,
  SessionExpiredError,
  SignInTemporarilyBlockedError,
  SubmissionRejectedError,
  TooManyRequestsError,
  UnauthenticatedError,
  UnsupportedContentTypeError,
  UnsupportedImageTypeError,
  ValidationFailedError,
  type ApplicationError,
  type ErrorDetail,
} from '../src/utils/application-error.js';

export const SAMPLE_DETAILS: readonly ErrorDetail[] = [
  { field: 'title', code: 'REQUIRED', message: 'Title is required.' },
];

export interface ErrorCase {
  status: number;
  code: string;
  create: () => ApplicationError;
}

/**
 * Every row of the status code mapping in API_DESIGN.md Section 13.2 that has a code. Written out
 * by hand from the contract, so a test fails if the implementation drifts from it.
 */
export const ERROR_CASES: readonly ErrorCase[] = [
  { status: 400, code: 'MALFORMED_REQUEST', create: () => new MalformedRequestError() },
  { status: 400, code: 'SUBMISSION_REJECTED', create: () => new SubmissionRejectedError() },
  { status: 401, code: 'UNAUTHENTICATED', create: () => new UnauthenticatedError() },
  { status: 401, code: 'SESSION_EXPIRED', create: () => new SessionExpiredError() },
  { status: 401, code: 'INVALID_CREDENTIALS', create: () => new InvalidCredentialsError() },
  { status: 403, code: 'FORBIDDEN', create: () => new ForbiddenError() },
  { status: 404, code: 'NOT_FOUND', create: () => new NotFoundError() },
  {
    status: 405,
    code: 'METHOD_NOT_ALLOWED',
    create: () => new MethodNotAllowedError(['GET', 'HEAD']),
  },
  { status: 409, code: 'DUPLICATE_SKILL', create: () => new DuplicateSkillError() },
  { status: 413, code: 'REQUEST_TOO_LARGE', create: () => new RequestTooLargeError() },
  { status: 413, code: 'IMAGE_TOO_LARGE', create: () => new ImageTooLargeError() },
  {
    status: 415,
    code: 'UNSUPPORTED_CONTENT_TYPE',
    create: () => new UnsupportedContentTypeError(),
  },
  { status: 415, code: 'UNSUPPORTED_IMAGE_TYPE', create: () => new UnsupportedImageTypeError() },
  {
    status: 422,
    code: 'VALIDATION_FAILED',
    create: () => new ValidationFailedError(SAMPLE_DETAILS),
  },
  {
    status: 422,
    code: 'PUBLISH_REQUIREMENTS_NOT_MET',
    create: () => new PublishRequirementsNotMetError(SAMPLE_DETAILS),
  },
  {
    status: 422,
    code: 'PUBLISHED_RECORD_INVALID',
    create: () => new PublishedRecordInvalidError(),
  },
  {
    status: 422,
    code: 'INVALID_QUERY_PARAMETER',
    create: () => new InvalidQueryParameterError(SAMPLE_DETAILS),
  },
  { status: 422, code: 'IMAGE_LIMIT_REACHED', create: () => new ImageLimitReachedError() },
  { status: 429, code: 'TOO_MANY_REQUESTS', create: () => new TooManyRequestsError(30) },
  {
    status: 429,
    code: 'SIGN_IN_TEMPORARILY_BLOCKED',
    create: () => new SignInTemporarilyBlockedError(900),
  },
  { status: 500, code: 'INTERNAL_ERROR', create: () => new InternalError() },
  { status: 503, code: 'SERVICE_UNAVAILABLE', create: () => new ServiceUnavailableError() },
  {
    status: 503,
    code: 'MEDIA_SERVICE_UNAVAILABLE',
    create: () => new MediaServiceUnavailableError(),
  },
];
