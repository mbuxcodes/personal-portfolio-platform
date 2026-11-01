import type { Response } from 'express';
import type { ErrorDetail } from '#utils/application-error';
import { getRequestContext } from '#utils/request-context';

/** A refusal: the status, the stable code, and a plain-language message. */
export interface Rejection {
  status: number;
  code: string;
  /** Written for the person using the product (API_DESIGN.md Section 13.3). Never internal detail. */
  message: string;
  /** The field problems of a validation failure (API_DESIGN.md Section 8.4). */
  details?: readonly ErrorDetail[];
  /** Stated in the body as well as in the header, for a blocked sign-in (API_DESIGN.md Section 5.3). */
  retryAfterSeconds?: number;
  headers?: Readonly<Record<string, string>>;
}

/**
 * Builds and sends the standard error response (API_DESIGN.md Section 8.3), with the request
 * identifier when the request has one. This is the only place where the shape is written.
 *
 * The shared pipeline calls it for the refusals that happen before any route runs (M2.4). The
 * central error handler (M2.5) calls it for every other failure. A typed `ApplicationError` has the
 * same fields, so it is sent as it is.
 */
export function sendRejection(response: Response, rejection: Rejection): void {
  const requestId = getRequestContext(response)?.requestId;

  for (const [name, value] of Object.entries(rejection.headers ?? {})) {
    response.setHeader(name, value);
  }

  response.status(rejection.status).json({
    error: {
      code: rejection.code,
      message: rejection.message,
      ...(rejection.details === undefined ? {} : { details: rejection.details }),
      ...(rejection.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: rejection.retryAfterSeconds }),
      ...(requestId === undefined ? {} : { requestId }),
    },
  });
}
