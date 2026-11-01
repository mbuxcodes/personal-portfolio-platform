import { describe, expect, it } from 'vitest';
import { PUBLIC_ROUTE_TABLE } from '@/routing/public-route-table';

describe('PUBLIC_ROUTE_TABLE', () => {
  it('lists the nine public areas, with list and detail pages for projects and the blog', () => {
    expect(PUBLIC_ROUTE_TABLE.map((route) => route.name)).toEqual([
      'home',
      'about',
      'skills',
      'experience',
      'education',
      'certifications',
      'projects',
      'projectDetail',
      'blog',
      'article',
      'contact',
    ]);
  });

  it('gives every page its own address', () => {
    const paths = PUBLIC_ROUTE_TABLE.map((route) => route.path);

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.startsWith('/'))).toBe(true);
  });

  it('uses the public address name for detail pages', () => {
    const detailPaths = PUBLIC_ROUTE_TABLE.filter((route) => route.path.includes(':')).map(
      (route) => route.path,
    );

    expect(detailPaths).toEqual(['/projects/:publicAddressName', '/blog/:publicAddressName']);
  });

  it('never lists the admin area', () => {
    expect(PUBLIC_ROUTE_TABLE.some((route) => route.path.startsWith('/admin'))).toBe(false);
  });
});
