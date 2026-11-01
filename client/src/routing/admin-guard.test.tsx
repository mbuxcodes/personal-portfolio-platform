import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminGuard } from '@/routing/admin-guard';
import { useAdminGuard } from '@/routing/use-admin-guard';

vi.mock('@/routing/use-admin-guard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/routing/use-admin-guard')>()),
  useAdminGuard: vi.fn(),
}));

function renderGuardedPage() {
  const router = createMemoryRouter(
    [{ Component: AdminGuard, children: [{ path: '/', element: <p>Guarded page</p> }] }],
    { initialEntries: ['/'] },
  );

  render(<RouterProvider router={router} />);
}

afterEach(() => {
  vi.resetAllMocks();
});

describe('AdminGuard', () => {
  it('shows the guarded page when access is allowed', () => {
    vi.mocked(useAdminGuard).mockReturnValue({ isAllowed: true });

    renderGuardedPage();

    expect(screen.getByText('Guarded page')).toBeInTheDocument();
  });

  it('hides the guarded page when access is not allowed', () => {
    vi.mocked(useAdminGuard).mockReturnValue({ isAllowed: false });

    renderGuardedPage();

    expect(screen.queryByText('Guarded page')).not.toBeInTheDocument();
  });
});
