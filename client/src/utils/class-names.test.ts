import { describe, expect, it } from 'vitest';
import { classNames } from './class-names';

describe('classNames', () => {
  it('joins the names that are present', () => {
    expect(classNames('a', 'b')).toBe('a b');
  });

  it('skips false, null, undefined and empty values', () => {
    expect(classNames('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('returns an empty string when nothing is left', () => {
    expect(classNames(false, undefined)).toBe('');
  });
});
