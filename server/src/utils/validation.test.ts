import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ApplicationError,
  InvalidQueryParameterError,
  NotFoundError,
  ValidationFailedError,
  type ErrorDetail,
} from '#utils/application-error';
import { validateInput } from '#utils/validation';
import { fieldNameOf, READ_ONLY_FIELDS } from '#utils/validation-details';

function failure(run: () => unknown): ApplicationError {
  try {
    run();
  } catch (error) {
    if (error instanceof ApplicationError) return error;
    throw error;
  }
  throw new Error('Expected the validation to fail.');
}

const detailsOf = (run: () => unknown): readonly ErrorDetail[] | undefined => failure(run).details;

const project = z.strictObject({
  roleTitle: z.string().trim().min(1),
  summary: z.string().trim().min(10).max(40).optional(),
  technologies: z
    .array(z.string().max(50, 'Each technology must be 50 characters or fewer.'))
    .max(3)
    .optional(),
  website: z.url().optional(),
  contactEmail: z.email().optional(),
  startDate: z.iso.date().optional(),
  level: z.enum(['beginner', 'expert']).optional(),
  count: z.number().int().min(1).max(5).optional(),
  professionalLinks: z
    .array(z.strictObject({ address: z.url(), label: z.string().min(1) }))
    .optional(),
});

const check = (body: unknown) => () => validateInput('body', project, body);

describe('field names', () => {
  it.each([
    [['roleTitle'], 'roleTitle'],
    [['technologies', 2], 'technologies[2]'],
    [['professionalLinks', 0, 'address'], 'professionalLinks[0].address'],
    [['a', 'b', 'c'], 'a.b.c'],
    [[0, 'name'], '[0].name'],
    [['rows', 1, 'cells', 2], 'rows[1].cells[2]'],
    [[], ''],
    [['a', Symbol('hidden'), 'b'], 'a.b'],
  ] as const)('%j is %s', (path, expected) => {
    expect(fieldNameOf(path)).toBe(expected);
  });
});

describe('a valid request', () => {
  it('returns the parsed value, with the schema’s own changes applied', () => {
    expect(validateInput('body', project, { roleTitle: '  Lead engineer  ' })).toEqual({
      roleTitle: 'Lead engineer',
    });
  });
});

describe('translation of problems into detail codes', () => {
  it('REQUIRED for a field that is missing', () => {
    expect(detailsOf(check({}))).toEqual([
      { field: 'roleTitle', code: 'REQUIRED', message: 'Role title is required.' },
    ]);
  });

  it.each([
    ['null', null],
    ['an empty text', ''],
    ['blank spaces', '   '],
  ])('REQUIRED for a field that is %s', (_name, value) => {
    expect(detailsOf(check({ roleTitle: value }))).toEqual([
      { field: 'roleTitle', code: 'REQUIRED', message: 'Role title is required.' },
    ]);
  });

  it('REQUIRED for a missing field when no body was sent at all', () => {
    expect(detailsOf(() => validateInput('body', project, undefined))).toEqual([
      { field: 'roleTitle', code: 'REQUIRED', message: 'Role title is required.' },
    ]);
  });

  it('INVALID_FORMAT for a value of the wrong type', () => {
    expect(detailsOf(check({ roleTitle: 42 }))).toEqual([
      { field: 'roleTitle', code: 'INVALID_FORMAT', message: 'Role title is not valid.' },
    ]);
  });

  it('TOO_SHORT, with the minimum', () => {
    expect(detailsOf(check({ roleTitle: 'x', summary: 'short' }))).toEqual([
      { field: 'summary', code: 'TOO_SHORT', message: 'Summary must be at least 10 characters.' },
    ]);
  });

  it('TOO_LONG, with the maximum', () => {
    expect(detailsOf(check({ roleTitle: 'x', summary: 'x'.repeat(41) }))).toEqual([
      { field: 'summary', code: 'TOO_LONG', message: 'Summary must be 40 characters or fewer.' },
    ]);
  });

  it('LIST_TOO_LONG, with the maximum', () => {
    expect(detailsOf(check({ roleTitle: 'x', technologies: ['a', 'b', 'c', 'd'] }))).toEqual([
      {
        field: 'technologies',
        code: 'LIST_TOO_LONG',
        message: 'Technologies can have at most 3 items.',
      },
    ]);
  });

  it('names the item of a list, as technologies[2]', () => {
    const details = detailsOf(check({ roleTitle: 'x', technologies: ['a', 'b', 'x'.repeat(51)] }));

    expect(details).toEqual([
      {
        field: 'technologies[2]',
        code: 'TOO_LONG',
        message: 'Each technology must be 50 characters or fewer.',
      },
    ]);
  });

  it('INVALID_URL', () => {
    expect(detailsOf(check({ roleTitle: 'x', website: 'not a web address' }))).toEqual([
      {
        field: 'website',
        code: 'INVALID_URL',
        message: 'Website must be a complete, valid web address.',
      },
    ]);
  });

  it('INVALID_FORMAT for an email address', () => {
    expect(detailsOf(check({ roleTitle: 'x', contactEmail: 'nobody' }))?.[0]).toMatchObject({
      field: 'contactEmail',
      code: 'INVALID_FORMAT',
    });
  });

  it.each(['2026-13-45', '2026-02-30', 'yesterday'])('INVALID_DATE for %s', (value) => {
    expect(detailsOf(check({ roleTitle: 'x', startDate: value }))).toEqual([
      { field: 'startDate', code: 'INVALID_DATE', message: 'Start date must be a real date.' },
    ]);
  });

  it('NOT_ALLOWED_VALUE for a value outside a fixed set', () => {
    expect(detailsOf(check({ roleTitle: 'x', level: 'wizard' }))?.[0]).toMatchObject({
      field: 'level',
      code: 'NOT_ALLOWED_VALUE',
    });
  });

  it.each([0, 6])('NOT_ALLOWED_VALUE for a number outside its range (%s)', (value) => {
    expect(detailsOf(check({ roleTitle: 'x', count: value }))?.[0]).toMatchObject({
      field: 'count',
      code: 'NOT_ALLOWED_VALUE',
    });
  });

  it('INVALID_FORMAT for a number that is not whole', () => {
    expect(detailsOf(check({ roleTitle: 'x', count: 1.5 }))?.[0]).toMatchObject({
      field: 'count',
      code: 'INVALID_FORMAT',
    });
  });

  it('INVALID_FORMAT, named after the source, for a body that is not an object', () => {
    expect(detailsOf(() => validateInput('body', project, []))).toEqual([
      { field: 'body', code: 'INVALID_FORMAT', message: 'This value is not valid.' },
    ]);
  });
});

describe('nested fields and lists', () => {
  it('names a nested field with dots and an index', () => {
    const details = detailsOf(
      check({ roleTitle: 'x', professionalLinks: [{ address: 'nope', label: 'Site' }] }),
    );

    expect(details).toEqual([
      {
        field: 'professionalLinks[0].address',
        code: 'INVALID_URL',
        message: 'Address must be a complete, valid web address.',
      },
    ]);
  });

  it('names a missing nested field as REQUIRED', () => {
    expect(
      detailsOf(check({ roleTitle: 'x', professionalLinks: [{ label: 'a' }, { label: 'b' }] })),
    ).toEqual([
      {
        field: 'professionalLinks[0].address',
        code: 'REQUIRED',
        message: 'Address is required.',
      },
      {
        field: 'professionalLinks[1].address',
        code: 'REQUIRED',
        message: 'Address is required.',
      },
    ]);
  });

  it('rejects an unknown field inside a nested object', () => {
    expect(
      detailsOf(
        check({
          roleTitle: 'x',
          professionalLinks: [{ address: 'https://example.com', label: 'a', color: 'red' }],
        }),
      ),
    ).toEqual([
      {
        field: 'professionalLinks[0].color',
        code: 'UNKNOWN_FIELD',
        message: 'Color is not accepted here.',
      },
    ]);
  });
});

describe('unknown and read-only fields', () => {
  it('rejects an unknown field with UNKNOWN_FIELD', () => {
    expect(detailsOf(check({ roleTitle: 'x', nickname: 'Rex' }))).toEqual([
      { field: 'nickname', code: 'UNKNOWN_FIELD', message: 'Nickname is not accepted here.' },
    ]);
  });

  it.each([...READ_ONLY_FIELDS])('rejects the read-only field %s with READ_ONLY', (field) => {
    expect(detailsOf(check({ roleTitle: 'x', [field]: 'anything' }))).toEqual([
      { field, code: 'READ_ONLY', message: expect.stringMatching(/cannot be set\.$/) },
    ]);
  });

  it('lists every read-only field of API_DESIGN.md Section 7.0', () => {
    expect([...READ_ONLY_FIELDS].sort()).toEqual(
      [
        'createdAt',
        'id',
        'lastEditedAt',
        'publicAddressName',
        'publishedAt',
        'status',
        'updatedAt',
      ].sort(),
    );
  });

  it('reports each unknown field once, whether or not the schema is strict', () => {
    const looseSchema = z.object({ title: z.string() });

    const details = detailsOf(() => validateInput('body', looseSchema, { title: 'x', a: 1, b: 2 }));

    expect(details?.map(({ field, code }) => [field, code])).toEqual([
      ['a', 'UNKNOWN_FIELD'],
      ['b', 'UNKNOWN_FIELD'],
    ]);
  });

  it('rejects an unknown field even when everything else is valid and the schema strips', () => {
    const stripping = z.object({ title: z.string() });

    expect(
      failure(() => validateInput('body', stripping, { title: 'ok', extra: true })),
    ).toBeInstanceOf(ValidationFailedError);
  });

  it('reports a server-controlled field in a query as unknown, not read-only', () => {
    const query = z.strictObject({ page: z.string().optional() });

    expect(detailsOf(() => validateInput('query', query, { id: '5' }))).toEqual([
      { field: 'id', code: 'UNKNOWN_FIELD', message: 'Id is not accepted here.' },
    ]);
  });

  it('allows a read-only name when the schema declares it, as the status endpoints do', () => {
    const statusBody = z.strictObject({ status: z.enum(['draft', 'published']) });

    expect(validateInput('body', statusBody, { status: 'published' })).toEqual({
      status: 'published',
    });
  });
});

describe('all problems are reported together', () => {
  it('lists every problem of a request in one failure, in the order found', () => {
    const details = detailsOf(
      check({
        website: 'nope',
        technologies: ['a', 'b', 'x'.repeat(51)],
        nickname: 'Rex',
        id: '1',
      }),
    );

    expect(details?.map(({ field, code }) => [field, code])).toEqual([
      ['roleTitle', 'REQUIRED'],
      ['technologies[2]', 'TOO_LONG'],
      ['website', 'INVALID_URL'],
      ['nickname', 'UNKNOWN_FIELD'],
      ['id', 'READ_ONLY'],
    ]);
  });

  it('never lists the same problem twice', () => {
    const details = detailsOf(check({ roleTitle: 'x', nickname: 'Rex' }));

    expect(details).toHaveLength(1);
  });
});

describe('wording', () => {
  it('keeps a message that the schema chose, and writes one only when the schema gave none', () => {
    const schema = z.strictObject({
      chosen: z.string().min(5, 'Pick something longer, please.'),
      unchosen: z.string().min(5),
    });

    expect(detailsOf(() => validateInput('body', schema, { chosen: 'a', unchosen: 'a' }))).toEqual([
      { field: 'chosen', code: 'TOO_SHORT', message: 'Pick something longer, please.' },
      { field: 'unchosen', code: 'TOO_SHORT', message: 'Unchosen must be at least 5 characters.' },
    ]);
  });

  it('writes a label from the field name', () => {
    const schema = z.strictObject({ senderEmailAddress: z.string() });

    expect(detailsOf(() => validateInput('body', schema, {}))?.[0]?.message).toBe(
      'Sender email address is required.',
    );
  });

  it('labels a list item by its position', () => {
    const schema = z.strictObject({ tags: z.array(z.string().min(2)) });

    expect(detailsOf(() => validateInput('body', schema, { tags: ['ok', 'x'] }))?.[0]).toEqual({
      field: 'tags[1]',
      code: 'TOO_SHORT',
      message: 'Tags (item 2) must be at least 2 characters.',
    });
  });
});

describe('rules written by a schema', () => {
  const period = z
    .strictObject({ startDate: z.iso.date(), endDate: z.iso.date().optional() })
    .refine((value) => value.endDate === undefined || value.endDate >= value.startDate, {
      path: ['endDate'],
      message: 'The end date cannot be before the start date.',
      params: { code: 'END_BEFORE_START' },
    });

  it('uses the detail code that the rule names', () => {
    expect(
      detailsOf(() =>
        validateInput('body', period, { startDate: '2026-05-01', endDate: '2026-01-01' }),
      ),
    ).toEqual([
      {
        field: 'endDate',
        code: 'END_BEFORE_START',
        message: 'The end date cannot be before the start date.',
      },
    ]);
  });

  it('accepts a request that keeps the rule', () => {
    expect(
      validateInput('body', period, { startDate: '2026-01-01', endDate: '2026-05-01' }),
    ).toEqual({ startDate: '2026-01-01', endDate: '2026-05-01' });
  });

  it('falls back to INVALID_FORMAT for a rule that names no code', () => {
    const schema = z.strictObject({ name: z.string() }).refine((value) => value.name !== 'taken', {
      path: ['name'],
      message: 'Choose another name.',
    });

    expect(detailsOf(() => validateInput('body', schema, { name: 'taken' }))).toEqual([
      { field: 'name', code: 'INVALID_FORMAT', message: 'Choose another name.' },
    ]);
  });
});

describe('the kind of failure follows where the value came from', () => {
  const schema = z.strictObject({
    id: z.string().regex(/^[0-9a-f]{24}$/),
    page: z.string().optional(),
  });

  it('is 404 NOT_FOUND for a path value, with no detail about it', () => {
    const error = failure(() => validateInput('params', schema, { id: 'not-an-id' }));

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.status).toBe(404);
    expect(error.details).toBeUndefined();
  });

  it('is 422 INVALID_QUERY_PARAMETER for the query, with details', () => {
    const error = failure(() =>
      validateInput('query', z.strictObject({ page: z.string().regex(/^\d+$/) }), {
        page: 'x',
        q: '1',
      }),
    );

    expect(error).toBeInstanceOf(InvalidQueryParameterError);
    expect(error.status).toBe(422);
    expect(error.code).toBe('INVALID_QUERY_PARAMETER');
    expect(error.details?.map(({ field, code }) => [field, code])).toEqual([
      ['page', 'INVALID_FORMAT'],
      ['q', 'UNKNOWN_FIELD'],
    ]);
  });

  it('is 422 VALIDATION_FAILED for the body', () => {
    const error = failure(() => validateInput('body', schema, {}));

    expect(error).toBeInstanceOf(ValidationFailedError);
    expect(error.status).toBe(422);
    expect(error.code).toBe('VALIDATION_FAILED');
  });

  it('returns the parsed value for a valid path value and query', () => {
    expect(validateInput('params', schema, { id: 'e5f6a7b8c9d0e1f2a3b4c5d6' })).toEqual({
      id: 'e5f6a7b8c9d0e1f2a3b4c5d6',
    });
  });
});
