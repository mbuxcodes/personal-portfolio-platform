import type { ErrorRequestHandler } from 'express';
import {
  ApplicationError,
  InternalError,
  MalformedRequestError,
  RequestTooLargeError,
  UnsupportedContentTypeError,
} from '#utils/application-error';
import { describeError, type Logger } from '#utils/logger';
import { sendRejection } from '#utils/rejection';
import { getRequestContext } from '#utils/request-context';

/** Written for every failure that was raised on purpose. */
export const REQUEST_FAILED_EVENT = 'request_failed';
/** Written for every failure that was not, with the full detail. */
export const UNEXPECTED_ERROR_EVENT = 'unexpected_error';

/**
 * The failures that the body parser reports in its own form, by the `type` it sets. They come from
 * `express.json` in step 4 of the pipeline. Anything else it reports is unexpected.
 */
function fromBodyParser(error: unknown): ApplicationError | undefined {
  const type =
    typeof error === 'object' && error !== null ? (error as { type?: unknown }).type : null;
  switch (type) {
    case 'entity.parse.failed':
    case 'request.aborted':
    case 'request.size.invalid':
      return new MalformedRequestError({ cause: error });
    case 'entity.too.large':
      return new RequestTooLargeError({ cause: error });
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new UnsupportedContentTypeError({ cause: error });
    default:
      return undefined;
  }
}

export interface ErrorHandlerOptions {
  /** Used for a failure that happens before the request has a logger of its own. */
  logger: Logger;
}

/**
 * Central error handling, the last stage of the request pipeline (ARCHITECTURE_DESIGN.md Section
 * 7.3, ADR-19). Every failure of every layer arrives here, whether it comes from synchronous code,
 * from asynchronous code (Express 5 forwards a rejected promise), or from middleware, and leaves in
 * the standard shape.
 *
 * - A typed `ApplicationError` is sent as it is and logged at its own level, with its code.
 * - The body parser's malformed JSON becomes `400 MALFORMED_REQUEST`.
 * - Anything else is a bug. It becomes `500 INTERNAL_ERROR` with the generic message, and one
 *   `error` entry carries the name, message, and stack. A response never contains any of that.
 *
 * When the response has already begun, nothing can be changed, so the failure is logged and Express
 * closes the connection.
 */
export function createErrorHandler({ logger }: ErrorHandlerOptions): ErrorRequestHandler {
  return (error: unknown, _request, response, next) => {
    const log = getRequestContext(response)?.logger ?? logger;
    const known = error instanceof ApplicationError ? error : fromBodyParser(error);

    if (known === undefined) {
      log.error(UNEXPECTED_ERROR_EVENT, { error: describeError(error) });
    } else {
      log[known.logLevel](REQUEST_FAILED_EVENT, {
        code: known.code,
        status: known.status,
        ...(known.cause === undefined ? {} : { cause: describeError(known.cause) }),
      });
    }

    if (response.headersSent) {
      next(error);
      return;
    }
    sendRejection(response, known ?? new InternalError({ cause: error }));
  };
}
