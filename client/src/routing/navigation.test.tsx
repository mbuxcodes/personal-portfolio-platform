import { act, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { appRoutes } from '@/routing/app-routes';

async function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });

  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 });

  return router;
}

describe('navigation', () => {
  it('moves focus to the main heading when the page changes', async () => {
    const router = await renderAt('/');

    await act(() => router.navigate('/about'));

    const heading = await screen.findByRole('heading', { level: 1, name: 'About' });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('moves focus to the main heading of a lazily loaded admin page', async () => {
    const router = await renderAt('/about');

    await act(() => router.navigate('/admin/projects'));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Manage projects' });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('moves focus again when the next page has the same kind of heading', async () => {
    const router = await renderAt('/projects/first');

    await act(() => router.navigate('/projects/second'));

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Project' })).toHaveFocus(),
    );
  });

  it('leaves focus alone on first load', async () => {
    await renderAt('/about');

    expect(screen.getByRole('heading', { level: 1, name: 'About' })).not.toHaveFocus();
  });

  it('leaves focus alone when only the search or hash changes', async () => {
    const router = await renderAt('/projects');
    const heading = screen.getByRole('heading', { level: 1, name: 'Projects' });

    await act(() => router.navigate('/projects?page=2#results'));

    expect(heading).not.toHaveFocus();
  });

  it('does not add the heading to the Tab order', async () => {
    const router = await renderAt('/');

    await act(() => router.navigate('/about'));

    const heading = await screen.findByRole('heading', { level: 1, name: 'About' });
    await waitFor(() => expect(heading).toHaveAttribute('tabindex', '-1'));
  });

  it('announces the new page to screen readers', async () => {
    const router = await renderAt('/');

    await act(() => router.navigate('/about'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Navigated to About | Muhammad Bux Brohi',
      ),
    );
  });

  it('announces nothing on first load', async () => {
    await renderAt('/about');

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('announces the not-found page', async () => {
    const router = await renderAt('/');

    await act(() => router.navigate('/no-such-page'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Navigated to Page not found | Muhammad Bux Brohi',
      ),
    );
  });
});
