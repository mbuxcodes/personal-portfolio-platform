import type { z } from 'zod';
import {
  InvalidQueryParameterError,
  NotFoundError,
  ValidationFailedError,
} from '#utils/application-error';
import {
  translateIssues,
  UNSET_MESSAGE,
  type InputSource,
  type IssueLike,
} from '#utils/validation-details';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Top-level keys that the schema does not declare, found without relying on the schema being
 * strict. "Unknown fields are rejected" must not depend on the author of a schema remembering to
 * use `z.strictObject`, so the helper checks for itself. Nested objects are the schema's business.
 */
function unknownKeyIssues(schema: z.ZodType, input: unknown): IssueLike[] {
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape;
  if (shape === undefined || !isRecord(input)) return [];
  const unknown = Object.keys(input).filter((key) => !Object.hasOwn(shape, key));
  return unknown.length === 0
    ? []
    : [{ code: 'unrecognized_keys', path: [], message: UNSET_MESSAGE, keys: unknown }];
}

/**
 * Checks one part of a request against its schema and returns the parsed value.
 *
 * Request schemas are written with Zod from the contract (TD-009). This is the single place that
 * decides how a failure is reported, so every endpoint answers in the same way:
 *
 * - body: `422 VALIDATION_FAILED` with a detail for every problem. Unknown fields are
 *   `UNKNOWN_FIELD` and server-controlled fields are `READ_ONLY`.
 * - query: `422 INVALID_QUERY_PARAMETER`, with a detail for each parameter. An unknown parameter is
 *   never ignored silently (API_DESIGN.md Section 10.2).
 * - params: `404 NOT_FOUND`. A path value that cannot be valid cannot identify a record, and the
 *   response is the same as for one that does not exist (API_DESIGN.md Section 8.6).
 *
 * A missing body is checked as an empty one, so each required field is reported at its field.
 */
export function validateInput<Output>(
  source: InputSource,
  schema: z.ZodType<Output>,
  input: unknown,
): Output {
  const subject = source === 'body' ? (input ?? {}) : input;
  const parsed = schema.safeParse(subject, { error: () => UNSET_MESSAGE });

  const issues = [
    ...(parsed.success ? [] : (parsed.error.issues as readonly IssueLike[])),
    ...unknownKeyIssues(schema, subject),
  ];
  if (parsed.success && issues.length === 0) return parsed.data;

  if (source === 'params') throw new NotFoundError();
  const details = translateIssues(issues, subject, source);
  throw source === 'query'
    ? new InvalidQueryParameterError(details)
    : new ValidationFailedError(details);
}
