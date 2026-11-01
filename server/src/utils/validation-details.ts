import {
  VALIDATION_DETAIL_CODES,
  type ErrorDetail,
  type ValidationDetailCode,
} from '#utils/application-error';

/**
 * Where a request value came from. It decides what an unknown field means: in a body, a field the
 * server controls is `READ_ONLY`, while in a query or path every unknown name is `UNKNOWN_FIELD`.
 */
export type InputSource = 'params' | 'query' | 'body';

/**
 * The fields that clients can never set (API_DESIGN.md Section 7.0). Sending one in a body is
 * `READ_ONLY`, not `UNKNOWN_FIELD`, because the contract names them.
 */
export const READ_ONLY_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'publicAddressName',
  'publishedAt',
  'lastEditedAt',
  'status',
]);

/**
 * The message the validation helper asks Zod to use when a schema gave none. An issue that still
 * carries it has no wording of its own, so the helper writes one. An issue with any other message
 * is wording that a schema author chose on purpose (for example "Each technology must be 50
 * characters or fewer."), and it is kept.
 */
export const UNSET_MESSAGE = '\u0000unset';

/** The parts of a Zod issue that the translation reads. Everything else is ignored. */
export interface IssueLike {
  code: string;
  path: readonly PropertyKey[];
  message: string;
  origin?: string;
  format?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  keys?: readonly string[];
  params?: Record<string, unknown>;
}

/** `technologies[2]`, `professionalLinks[0].address`, or an empty text for the whole value. */
export function fieldNameOf(path: readonly PropertyKey[]): string {
  let field = '';
  for (const key of path) {
    if (typeof key === 'symbol') continue;
    if (typeof key === 'number') field += `[${key}]`;
    else field += field === '' ? key : `.${key}`;
  }
  return field;
}

/** The value that the request sent at a path, or undefined when nothing is there. */
function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  let current = input;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

const isBlank = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const humanize = (name: string): string => {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** "Role title" for `roleTitle`, and "Technologies (item 3)" for `technologies[2]`. */
function labelOf(path: readonly PropertyKey[]): string {
  const names = path.filter((key): key is string => typeof key === 'string');
  const name = names.at(-1);
  if (name === undefined) return 'This value';
  const last = path.at(-1);
  return typeof last === 'number' ? `${humanize(name)} (item ${last + 1})` : humanize(name);
}

const isDetailCode = (value: unknown): value is ValidationDetailCode =>
  (VALIDATION_DETAIL_CODES as readonly unknown[]).includes(value);

/** Chooses the API detail code for one Zod issue (API_DESIGN.md Section 8.4). */
function detailCodeOf(issue: IssueLike, value: unknown): ValidationDetailCode {
  switch (issue.code) {
    case 'invalid_type':
      return value === undefined || value === null ? 'REQUIRED' : 'INVALID_FORMAT';
    case 'too_small':
      if (issue.origin === 'string' || issue.origin === 'array') {
        return isBlank(value) ? 'REQUIRED' : 'TOO_SHORT';
      }
      return 'NOT_ALLOWED_VALUE';
    case 'too_big':
      if (issue.origin === 'string') return 'TOO_LONG';
      return issue.origin === 'array' ? 'LIST_TOO_LONG' : 'NOT_ALLOWED_VALUE';
    case 'invalid_format':
      if (issue.format === 'url') return 'INVALID_URL';
      return issue.format === 'date' || issue.format === 'datetime'
        ? 'INVALID_DATE'
        : 'INVALID_FORMAT';
    case 'invalid_value':
      return 'NOT_ALLOWED_VALUE';
    case 'custom': {
      // A rule written by a schema names its own detail code, such as END_BEFORE_START.
      const named = issue.params?.code;
      return isDetailCode(named) ? named : 'INVALID_FORMAT';
    }
    default:
      return 'INVALID_FORMAT';
  }
}

/** Wording for an issue whose schema gave none. Plain language that says what to fix. */
function messageFor(code: ValidationDetailCode, label: string, issue: IssueLike): string {
  switch (code) {
    case 'REQUIRED':
      return `${label} is required.`;
    case 'TOO_SHORT':
      return issue.origin === 'string' && issue.minimum !== undefined
        ? `${label} must be at least ${issue.minimum} characters.`
        : `${label} is too short.`;
    case 'TOO_LONG':
      return issue.maximum === undefined
        ? `${label} is too long.`
        : `${label} must be ${issue.maximum} characters or fewer.`;
    case 'LIST_TOO_LONG':
      return issue.maximum === undefined
        ? `${label} has too many items.`
        : `${label} can have at most ${issue.maximum} items.`;
    case 'INVALID_URL':
      return `${label} must be a complete, valid web address.`;
    case 'INVALID_DATE':
      return `${label} must be a real date.`;
    case 'END_BEFORE_START':
      return 'The end date cannot be before the start date.';
    case 'NOT_ALLOWED_VALUE':
      return `${label} has a value that is not allowed.`;
    case 'READ_ONLY':
      return `${label} cannot be set.`;
    case 'UNKNOWN_FIELD':
      return `${label} is not accepted here.`;
    default:
      return `${label} is not valid.`;
  }
}

/**
 * Translates Zod issues into the API's field details (API_DESIGN.md Section 8.4), one detail per
 * problem, in the order found. All problems are reported together, never one at a time.
 *
 * - `field` is the request field name. List items use an index and nested fields use dots.
 * - A value that is missing, null, or blank is `REQUIRED`. An unknown key is `UNKNOWN_FIELD`, or
 *   `READ_ONLY` in a body when it is a field the server controls.
 * - A problem with the whole value, which has no field, is named after where it came from.
 * - The same problem is never listed twice.
 */
export function translateIssues(
  issues: readonly IssueLike[],
  input: unknown,
  source: InputSource,
): ErrorDetail[] {
  const details = new Map<string, ErrorDetail>();
  const add = (detail: ErrorDetail): void => {
    const key = `${detail.field}|${detail.code}`;
    if (!details.has(key)) details.set(key, detail);
  };

  for (const issue of issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys ?? []) {
        const path = [...issue.path, key];
        const code = source === 'body' && READ_ONLY_FIELDS.has(key) ? 'READ_ONLY' : 'UNKNOWN_FIELD';
        add({
          field: fieldNameOf(path),
          code,
          message: messageFor(code, labelOf(path), issue),
        });
      }
      continue;
    }

    const code = detailCodeOf(issue, valueAt(input, issue.path));
    add({
      field: fieldNameOf(issue.path) || source,
      code,
      message:
        issue.message === UNSET_MESSAGE
          ? messageFor(code, labelOf(issue.path), issue)
          : issue.message,
    });
  }

  return [...details.values()];
}
