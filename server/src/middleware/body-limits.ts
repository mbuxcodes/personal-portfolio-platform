import express, {
  type ErrorRequestHandler,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { sendRejection } from '#utils/rejection';

/**
 * The largest JSON body. The biggest legitimate one is an article: up to 100,000 characters
 * (DATABASE_DESIGN.md), which is 400,000 bytes at the very most, plus its other fields. One
 * mebibyte leaves room and still stops abuse. The framework default of 100 kilobytes is too small.
 */
export const JSON_BODY_LIMIT_BYTES = 1024 * 1024;

/**
 * Room for everything in an upload request except the file: the text fields (the image description
 * is at most 200 characters), the part boundaries, and the part headers.
 */
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export interface BodyLimits {
  jsonBytes: number;
  /** The most a multipart request may declare: the upload limit plus the overhead. */
  multipartBytes: number;
}

const JSON_TYPE = 'application/json';
const MULTIPART_TYPE = 'multipart/form-data';

/** The methods that change data. Only these are held to the content-type rule (TD-030). */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const mediaTypeOf = (request: Request): string | undefined => {
  const header = request.headers['content-type'];
  const mediaType = header?.split(';')[0]?.trim().toLowerCase();
  return mediaType === '' ? undefined : mediaType;
};

/** The declared length, or undefined when it is missing. Node itself refuses malformed values. */
const declaredLengthOf = (request: Request): number | undefined => {
  const header = request.headers['content-length'];
  return header !== undefined && /^\d+$/.test(header) ? Number(header) : undefined;
};

function refuseTooLarge(response: Response): void {
  sendRejection(response, {
    status: 413,
    code: 'REQUEST_TOO_LARGE',
    message: 'The request is too large. Please send less data and try again.',
    // The rest of an oversized body is not worth reading, so the connection is closed.
    headers: { Connection: 'close' },
  });
}

/**
 * Checks the declared size and the content type, before anything is read.
 *
 * - A request that changes data (POST, PUT, PATCH, DELETE) and has a body, or names a content type,
 *   must be JSON or multipart. Everything else is `415 UNSUPPORTED_CONTENT_TYPE`. This also refuses
 *   the empty form that a page on another site can send, which has a form content type (TD-030).
 *   A request with no body and no content type, such as a sign-out, is allowed.
 * - A declared length over the limit is `413 REQUEST_TOO_LARGE`, without reading the body.
 * - A multipart request must declare its length, because its body is not read here, so a stream
 *   without a length could not be limited. It is `400 MALFORMED_REQUEST`.
 */
function createBodyPolicy(limits: BodyLimits): RequestHandler {
  return (request, response, next) => {
    const mediaType = mediaTypeOf(request);
    const length = declaredLengthOf(request);
    const hasBody =
      (length !== undefined && length > 0) || request.headers['transfer-encoding'] !== undefined;

    const isAllowedType = mediaType === JSON_TYPE || mediaType === MULTIPART_TYPE;
    const carriesContent = hasBody || mediaType !== undefined;
    if (WRITE_METHODS.has(request.method) && carriesContent && !isAllowedType) {
      sendRejection(response, {
        status: 415,
        code: 'UNSUPPORTED_CONTENT_TYPE',
        message: 'This kind of content is not supported. Please send JSON or a form with a file.',
      });
      return;
    }

    if (!hasBody) {
      next();
      return;
    }

    if (mediaType === MULTIPART_TYPE) {
      if (length === undefined) {
        sendRejection(response, {
          status: 400,
          code: 'MALFORMED_REQUEST',
          message: 'The request could not be read. Please check it and try again.',
        });
        return;
      }
      if (length > limits.multipartBytes) {
        refuseTooLarge(response);
        return;
      }
    } else if (length !== undefined && length > limits.jsonBytes) {
      refuseTooLarge(response);
      return;
    }

    next();
  };
}

/**
 * A body without a declared length is limited while it is read, and the parser reports it with this
 * type. Only that failure is handled here. Any other, such as malformed JSON, goes on unchanged to
 * the central error handler (M2.5), which maps it to `MALFORMED_REQUEST`.
 */
const refuseOversizedStream: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  const type =
    typeof error === 'object' && error !== null ? (error as { type?: unknown }).type : null;
  if (type === 'entity.too.large') {
    refuseTooLarge(response);
    return;
  }
  next(error);
};

/**
 * Step 4 of the request pipeline (ARCHITECTURE_DESIGN.md Section 7.3): body limits and content type.
 *
 * Three handlers, in order: the policy above, the JSON parser with its size limit (a JSON body is
 * read here, once, for every route), and the handler for an oversized stream. Multipart bodies are
 * not read here. The upload route reads them with the upload parser (M9), whose own limit
 * is the real file size limit. This step has already refused a request that declares more.
 */
export function createBodyLimits(limits: BodyLimits): (RequestHandler | ErrorRequestHandler)[] {
  return [
    createBodyPolicy(limits),
    express.json({ limit: limits.jsonBytes }),
    refuseOversizedStream,
  ];
}
