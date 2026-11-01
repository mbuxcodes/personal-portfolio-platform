import { describe, expect, it } from 'vitest';
import { formatPageTitle } from '@/utils/format-page-title';

describe('formatPageTitle', () => {
  it('returns the Home page title when no segment is given', () => {
    expect(formatPageTitle()).toBe('Muhammad Bux Brohi | Full Stack Developer');
  });

  it('puts the page name before the site name', () => {
    expect(formatPageTitle('About')).toBe('About | Muhammad Bux Brohi');
  });

  it('keeps the order of several segments, most specific first', () => {
    expect(formatPageTitle('Dashboard', 'Admin')).toBe('Dashboard | Admin | Muhammad Bux Brohi');
  });
});
