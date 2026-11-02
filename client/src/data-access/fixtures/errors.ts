import type { ErrorResponse } from '../types/errors';

/*
 * Error bodies copied from the examples in API_DESIGN.md. Each is typed, so a typo in a code or a
 * missing field fails type-check. The comment names the section the example comes from.
 */

/** Section 8.3 and 8.6. */
export const notFoundError = {
  error: {
    code: 'NOT_FOUND',
    message: 'We could not find what you were looking for.',
    requestId: 'req_5b2e90',
  },
} satisfies ErrorResponse;

/** Section 8.4. Shows a list index and a nested field name. */
export const validationFailedError = {
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Please correct the highlighted fields.',
    details: [
      { field: 'roleTitle', code: 'REQUIRED', message: 'Role title is required.' },
      {
        field: 'endDate',
        code: 'END_BEFORE_START',
        message: 'The end date cannot be before the start date.',
      },
      {
        field: 'technologies[2]',
        code: 'TOO_LONG',
        message: 'Each technology must be 50 characters or fewer.',
      },
    ],
    requestId: 'req_a81d47',
  },
} satisfies ErrorResponse;

/** Section 6.8. */
export const contactValidationError = {
  error: {
    code: 'VALIDATION_FAILED',
    message: 'Please correct the highlighted fields.',
    details: [
      {
        field: 'senderEmail',
        code: 'INVALID_FORMAT',
        message: 'Enter a valid email address.',
      },
      {
        field: 'messageText',
        code: 'TOO_SHORT',
        message: 'The message must be at least 10 characters.',
      },
    ],
    requestId: 'req_91ab33',
  },
} satisfies ErrorResponse;

/** Section 7.2.1: publishing a project that is not ready. */
export const publishRequirementsNotMetError = {
  error: {
    code: 'PUBLISH_REQUIREMENTS_NOT_MET',
    message: 'This project cannot be published yet. Complete the missing items first.',
    details: [
      {
        field: 'problemContext',
        code: 'MISSING_FOR_PUBLISH',
        message: 'Describe the problem or context.',
      },
      { field: 'role', code: 'MISSING_FOR_PUBLISH', message: 'Describe your role.' },
      { field: 'outcome', code: 'MISSING_FOR_PUBLISH', message: 'Describe the outcome.' },
      { field: 'images', code: 'MISSING_FOR_PUBLISH', message: 'Add a cover image.' },
    ],
    requestId: 'req_c0a4e1',
  },
} satisfies ErrorResponse;

/** Section 8.5. */
export const unauthenticatedError = {
  error: {
    code: 'UNAUTHENTICATED',
    message: 'Please sign in to continue.',
    requestId: 'req_30fa12',
  },
} satisfies ErrorResponse;

/** Section 8.5. The signal that starts a session renewal. */
export const sessionExpiredError = {
  error: {
    code: 'SESSION_EXPIRED',
    message: 'Your session has ended. Please sign in again.',
    requestId: 'req_30fa13',
  },
} satisfies ErrorResponse;

/** Section 8.7. */
export const internalError = {
  error: {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on our side. Please try again.',
    requestId: 'req_ff0271',
  },
} satisfies ErrorResponse;

/** Section 5.3. */
export const invalidCredentialsError = {
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'The email or password is incorrect.',
    requestId: 'req_7d1f0c',
  },
} satisfies ErrorResponse;

/** Section 5.3. The only example with `retryAfterSeconds`. */
export const signInBlockedError = {
  error: {
    code: 'SIGN_IN_TEMPORARILY_BLOCKED',
    message: 'Too many failed attempts. Please try again later.',
    retryAfterSeconds: 900,
    requestId: 'req_7d1f0d',
  },
} satisfies ErrorResponse;

/** Every error example, with the HTTP status the contract gives it (Section 13.2). */
export const errorFixtures = [
  { name: 'notFoundError', status: 404, body: notFoundError },
  { name: 'validationFailedError', status: 422, body: validationFailedError },
  { name: 'contactValidationError', status: 422, body: contactValidationError },
  { name: 'publishRequirementsNotMetError', status: 422, body: publishRequirementsNotMetError },
  { name: 'unauthenticatedError', status: 401, body: unauthenticatedError },
  { name: 'sessionExpiredError', status: 401, body: sessionExpiredError },
  { name: 'internalError', status: 500, body: internalError },
  { name: 'invalidCredentialsError', status: 401, body: invalidCredentialsError },
  { name: 'signInBlockedError', status: 429, body: signInBlockedError },
] as const satisfies readonly { name: string; status: number; body: ErrorResponse }[];
