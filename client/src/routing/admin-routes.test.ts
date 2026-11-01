import { describe, expect, it } from 'vitest';
import { ADMIN_BASE_PATH, adminRoutes } from '@/routing/admin-routes';

describe('adminRoutes', () => {
  it('has a single group under the admin base path', () => {
    expect(adminRoutes).toHaveLength(1);
    expect(adminRoutes[0]?.path).toBe(ADMIN_BASE_PATH);
    expect(ADMIN_BASE_PATH).toBe('/admin');
  });

  it('keeps sign-in outside the guard and every other page inside it', () => {
    const children = adminRoutes[0]?.children ?? [];
    const signIn = children.find((route) => route.path === 'sign-in');
    const guarded = children.find((route) => route.path === undefined);

    expect(signIn).toBeDefined();
    expect(guarded?.children?.map((route) => route.path ?? 'index')).toEqual([
      'index',
      'projects',
      'skills',
      'experience',
      'education',
      'certifications',
      'articles',
      'messages',
      'settings',
      'account',
    ]);
  });
});
