import type { Response } from 'express';
import { getRequestContext } from '#utils/request-context';

/** A refusal from the shared pipeline: the status, the stable code, and a plain-language message. */
export interface Rejection {
  status: number;
  code: string;
  /** Written for the person using the product (API_DESIGN.md Section 13.3). Never internal detail. */
  message: string;
  headers?: Readonly<Record<string, string>>;
}

/**
 * Sends a refusal in the standard error shape (API_DESIGN.md Section 8.3), with the request
 * identifier when the request has one.
 *
 * The pipeline refuses requests before any route runs, so it answers directly. The central error
 * handler and the typed error classes arrive in M2.5, and then take over the work of building
 * error responses. The shape stays the same, so clients and tests do not change.
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
      ...(requestId === undefined ? {} : { requestId }),
    },
  });
}
