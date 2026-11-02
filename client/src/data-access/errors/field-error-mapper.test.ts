import { describe, expect, it } from 'vitest';
import { validationFailedError } from '../fixtures';
import {
  getFieldError,
  mapFieldErrors,
  parseFieldPath,
  toFormErrorEntries,
  toFormPath,
} from './field-error-mapper';

const detail = (field: string, message = 'Problem.', code = 'REQUIRED') => ({
  field,
  code,
  message,
});

describe('parseFieldPath', () => {
  it.each([
    ['title', ['title']],
    ['endDate', ['endDate']],
    ['technologies[2]', ['technologies', 2]],
    ['professionalLinks[0].address', ['professionalLinks', 0, 'address']],
    ['a.b.c', ['a', 'b', 'c']],
    ['matrix[1][0]', ['matrix', 1, 0]],
    ['projects.0.title', ['projects', 0, 'title']],
    ['links[3].tags[1]', ['links', 3, 'tags', 1]],
  ])('reads %s', (field, expected) => {
    expect(parseFieldPath(field)).toEqual(expected);
  });

  it.each([
    [''],
    ['.'],
    ['a..b'],
    ['a.'],
    ['.a'],
    ['a[0'],
    ['a[x]'],
    ['a[-1]'],
    ['[]'],
    ['a[10001]'],
    ['items.99999.name'],
    ['__proto__'],
    ['a.__proto__.b'],
    ['constructor.prototype'],
  ])('refuses %j', (field) => {
    expect(parseFieldPath(field)).toBeNull();
  });
});

describe('toFormPath', () => {
  it('joins with dots, the way form libraries name a field', () => {
    expect(toFormPath(['professionalLinks', 0, 'address'])).toBe('professionalLinks.0.address');
    expect(toFormPath(['technologies', 2])).toBe('technologies.2');
  });
});

describe('mapFieldErrors', () => {
  it('maps the contract validation example, list index included', () => {
    const mapped = mapFieldErrors(validationFailedError.error.details);

    expect(Object.keys(mapped.byField)).toEqual(['roleTitle', 'endDate', 'technologies.2']);
    expect(mapped.byField['technologies.2']).toEqual({
      path: 'technologies.2',
      segments: ['technologies', 2],
      code: 'TOO_LONG',
      message: 'Each technology must be 50 characters or fewer.',
    });
    expect(mapped.unmapped).toEqual([]);
  });

  it('maps nested fields and list indexes to one form path (professionalLinks[0].address)', () => {
    const mapped = mapFieldErrors([detail('professionalLinks[0].address', 'Enter a web address.')]);

    expect(getFieldError(mapped, 'professionalLinks.0.address')?.message).toBe(
      'Enter a web address.',
    );
  });

  it('maps the dot style of a list index too (projects.0.title)', () => {
    const mapped = mapFieldErrors([detail('projects.0.title', 'Required')]);

    expect(getFieldError(mapped, 'projects.0.title')).toMatchObject({
      segments: ['projects', 0, 'title'],
      message: 'Required',
    });
  });

  it('keeps the first error of a field in byField, and every error in all', () => {
    const mapped = mapFieldErrors([
      detail('title', 'First.', 'REQUIRED'),
      detail('title', 'Second.', 'TOO_SHORT'),
      detail('summary', 'Third.', 'TOO_LONG'),
    ]);

    expect(mapped.byField.title?.message).toBe('First.');
    expect(mapped.all.map((error) => error.message)).toEqual(['First.', 'Second.', 'Third.']);
  });

  it('tells apart two items of one list', () => {
    const mapped = mapFieldErrors([detail('technologies[0]', 'A'), detail('technologies[1]', 'B')]);

    expect(getFieldError(mapped, 'technologies.0')?.message).toBe('A');
    expect(getFieldError(mapped, 'technologies.1')?.message).toBe('B');
  });

  it('never loses a detail: one with no usable field goes to unmapped', () => {
    const general = detail('', 'Something is wrong with the form.');
    const odd = detail('a[x]', 'Odd.');
    const mapped = mapFieldErrors([general, detail('title'), odd]);

    expect(mapped.unmapped).toEqual([general, odd]);
    expect(mapped.all).toHaveLength(1);
  });

  it('returns nothing for no details', () => {
    const mapped = mapFieldErrors([]);

    expect(mapped.all).toEqual([]);
    expect(mapped.unmapped).toEqual([]);
    expect(Object.keys(mapped.byField)).toEqual([]);
  });

  it('is safe against a server that names a field like an object method', () => {
    const mapped = mapFieldErrors([
      detail('toString'),
      detail('__proto__'),
      detail('hasOwnProperty'),
    ]);

    expect(Object.getPrototypeOf(mapped.byField)).toBeNull();
    expect(getFieldError(mapped, 'toString')?.path).toBe('toString');
    expect(getFieldError(mapped, 'valueOf')).toBeUndefined();
    expect(mapped.unmapped.map((item) => item.field)).toEqual(['__proto__']);
  });
});

describe('toFormErrorEntries', () => {
  it('gives one setError entry per field, using the form path and the detail code as type', () => {
    const mapped = mapFieldErrors(validationFailedError.error.details);

    expect(toFormErrorEntries(mapped)).toEqual([
      { name: 'roleTitle', type: 'REQUIRED', message: 'Role title is required.' },
      {
        name: 'endDate',
        type: 'END_BEFORE_START',
        message: 'The end date cannot be before the start date.',
      },
      {
        name: 'technologies.2',
        type: 'TOO_LONG',
        message: 'Each technology must be 50 characters or fewer.',
      },
    ]);
  });
});
