import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import type { Logger } from '#utils/logger';

/** What every later layer may know about the request it is serving. */
export interface RequestContext {
  /** Created by the server for this request. A value sent by the client is never used. */
  requestId: string;
  /** A logger that adds the request identifier to every entry. */
  logger: Logger;
}

const LOCALS_KEY = 'requestContext';

/** The identifier has the form shown in API_DESIGN.md Section 8.3: `req_` and random hexadecimal. */
export const createRequestId = (): string => `req_${randomBytes(8).toString('hex')}`;

export function setRequestContext(response: Response, context: RequestContext): void {
  response.locals[LOCALS_KEY] = context;
}

/**
 * The context set by the request tracing middleware. It is the way later middleware, controllers,
 * and the error handler read the request identifier and write entries that carry it.
 */
export function getRequestContext(response: Response): RequestContext | undefined {
  return response.locals[LOCALS_KEY] as RequestContext | undefined;
}
