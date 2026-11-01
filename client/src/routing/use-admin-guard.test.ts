import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAdminGuard } from '@/routing/use-admin-guard';

describe('useAdminGuard (placeholder)', () => {
  it('allows access until the session exists (Phase 5)', () => {
    const { result } = renderHook(() => useAdminGuard());

    expect(result.current).toEqual({ isAllowed: true });
  });
});
