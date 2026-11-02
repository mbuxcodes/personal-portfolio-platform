import type { ApiFieldDetail } from '../types/errors';

/*
 * Maps the `details` of a validation error onto form fields (API_DESIGN.md Section 8.4).
 *
 * The contract names a field with the request's own names: list items use an index,
 * `technologies[2]`, and nested fields use dots, `professionalLinks[0].address`. Form libraries
 * (React Hook Form, TD-008) name the same field with dots only: `technologies.2`,
 * `professionalLinks.0.address`. This file is the one place that translates between the two.
 */

/** One step of a field path: a property name, or a list index. */
export type FieldPathSegment = string | number;

export interface FieldError {
  /** The form field name, with dots only: `professionalLinks.0.address`. */
  path: string;
  /** The same path as steps: `['professionalLinks', 0, 'address']`. */
  segments: readonly FieldPathSegment[];
  /** The detail code, for example `REQUIRED` or `TOO_LONG`. */
  code: string;
  /** Plain-language text to show at the field. */
  message: string;
}

export interface MappedFieldErrors {
  /** The first error for each form field, by form path. Show this one at the field. */
  readonly byField: Readonly<Record<string, FieldError>>;
  /** Every field error, in the order the server sent them. */
  readonly all: readonly FieldError[];
  /**
   * Details with no field, or a field that cannot be read as a path. They belong to the form as a
   * whole, so show them as a general message and never drop them silently.
   */
  readonly unmapped: readonly ApiFieldDetail[];
}

/** An entry in the shape of React Hook Form's `setError(name, { type, message })`. */
export interface FormErrorEntry {
  name: string;
  type: string;
  message: string;
}

/**
 * Names that must never become part of a path. A caller that later writes values along a path
 * (for example `setValue`) must not be able to reach an object's prototype through a server
 * response.
 */
const FORBIDDEN_NAMES: ReadonlySet<string> = new Set(['__proto__', 'prototype', 'constructor']);

/** A list index larger than any list the contract allows makes no sense, so it is refused. */
const MAX_INDEX = 10_000;

/** `name`, then any number of `[n]`: `technologies[2]`, `matrix[1][0]`, or just `address`. */
const PART_PATTERN = /^([^[\].]*)((?:\[\d+\])*)$/;
const INDEX_PATTERN = /\[(\d+)\]/g;

/**
 * Reads a contract field name as a path. Returns `null` when the text is not a valid path.
 *
 * - `technologies[2]`            becomes `['technologies', 2]`
 * - `professionalLinks[0].address` becomes `['professionalLinks', 0, 'address']`
 * - `projects.0.title`           becomes `['projects', 0, 'title']`. A part made only of digits is
 *   read as a list index, so the dot style that form libraries use is accepted as well.
 */
export function parseFieldPath(field: string): FieldPathSegment[] | null {
  if (field === '') {
    return null;
  }

  const segments: FieldPathSegment[] = [];

  for (const part of field.split('.')) {
    if (/^\d+$/.test(part)) {
      const index = Number(part);
      if (index > MAX_INDEX) {
        return null;
      }
      segments.push(index);
      continue;
    }

    const match = PART_PATTERN.exec(part);
    if (match === null) {
      return null;
    }

    const name = match[1] ?? '';
    const indexes = match[2] ?? '';

    if (name === '' && indexes === '') {
      return null;
    }
    if (name !== '') {
      if (FORBIDDEN_NAMES.has(name)) {
        return null;
      }
      segments.push(name);
    }

    for (const found of indexes.matchAll(INDEX_PATTERN)) {
      const index = Number(found[1]);
      if (index > MAX_INDEX) {
        return null;
      }
      segments.push(index);
    }
  }

  return segments;
}

/** Joins a path with dots, the way form libraries name a field: `['a', 0, 'b']` is `a.0.b`. */
export function toFormPath(segments: readonly FieldPathSegment[]): string {
  return segments.join('.');
}

/**
 * Maps validation details onto form fields. It never throws, and it never loses a detail: each
 * one ends up in `all` (with a field) or in `unmapped` (without one).
 */
export function mapFieldErrors(details: readonly ApiFieldDetail[]): MappedFieldErrors {
  // A record without a prototype, so a field named like an object method is just a field name.
  const byField: Record<string, FieldError> = Object.create(null) as Record<string, FieldError>;
  const all: FieldError[] = [];
  const unmapped: ApiFieldDetail[] = [];

  for (const detail of details) {
    const segments = parseFieldPath(detail.field);

    if (segments === null) {
      unmapped.push(detail);
      continue;
    }

    const path = toFormPath(segments);
    const fieldError: FieldError = {
      path,
      segments,
      code: detail.code,
      message: detail.message,
    };

    all.push(fieldError);
    // Several problems can name one field. The first is the one shown at the field.
    byField[path] ??= fieldError;
  }

  return { byField, all, unmapped };
}

/** The error to show at one form field, or `undefined` when that field has none. */
export function getFieldError(mapped: MappedFieldErrors, path: string): FieldError | undefined {
  return mapped.byField[path];
}

/**
 * The first error of each field as `setError` entries. With React Hook Form:
 *
 *     for (const { name, ...error } of toFormErrorEntries(mapped)) setError(name, error);
 *
 * The cast is the caller's, because the form library types `name` by the form's own fields.
 */
export function toFormErrorEntries(mapped: MappedFieldErrors): FormErrorEntry[] {
  return Object.values(mapped.byField).map((error) => ({
    name: error.path,
    type: error.code,
    message: error.message,
  }));
}
