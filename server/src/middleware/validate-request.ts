import type { RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { validateInput } from '#utils/validation';

/** The Zod schemas for the parts of one request. Each is optional. */
export interface RequestSchemas {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
}

type OutputOf<Schema> = Schema extends z.ZodType ? z.output<Schema> : undefined;

/** What the controller receives: the parsed value of each part that had a schema. */
export interface ValidatedInput<Schemas extends RequestSchemas> {
  params: OutputOf<Schemas['params']>;
  query: OutputOf<Schemas['query']>;
  body: OutputOf<Schemas['body']>;
}

const LOCALS_KEY = 'validatedInput';

/**
 * Step 7 of the request pipeline (ARCHITECTURE_DESIGN.md Section 7.3): input validation.
 *
 * Routes attach it for each endpoint, after the route is matched, so path values are available.
 * It checks path values, the query, and the body, in that order, and stops at the first part that
 * fails. A failure is thrown as a typed error, which Express hands to the central error handler. On
 * success the parsed values are kept for the controller (see `getValidated`). They are parsed and
 * trimmed, not the raw request, so nothing unchecked is read downstream.
 */
export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (request, response, next) => {
    response.locals[LOCALS_KEY] = {
      params: schemas.params && validateInput('params', schemas.params, request.params),
      query: schemas.query && validateInput('query', schemas.query, request.query),
      body: schemas.body && validateInput('body', schemas.body, request.body),
    };
    next();
  };
}

/**
 * The parsed input of the request, for a controller. The type comes from the schemas:
 *
 *     const { params, body } = getValidated<typeof schemas>(response);
 *
 * Reading it on a route that did not attach `validateRequest` is a programming mistake, so it fails
 * loudly, and the client sees only a generic internal error.
 */
export function getValidated<Schemas extends RequestSchemas>(
  response: Response,
): ValidatedInput<Schemas> {
  const input = response.locals[LOCALS_KEY] as ValidatedInput<Schemas> | undefined;
  if (input === undefined) throw new Error('validateRequest was not attached to this route.');
  return input;
}
