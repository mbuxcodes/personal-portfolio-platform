import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { appRoutes } from './app-routes';
import { DEV_COMPONENTS_PATH, DEV_TOKENS_PATH, devRoutes } from './dev-routes';

describe('development routes', () => {
  it('lists the token reference page and the component gallery when the client runs in development', () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(devRoutes.map((route) => route.path)).toEqual([DEV_TOKENS_PATH, DEV_COMPONENTS_PATH]);
  });

  it('keeps the development pages ahead of the catch-all route', () => {
    const children = appRoutes[0].children ?? [];
    const paths = children.map((route) => route.path);

    expect(paths).toContain(DEV_TOKENS_PATH);
    expect(paths).toContain(DEV_COMPONENTS_PATH);
    expect(paths.indexOf(DEV_TOKENS_PATH)).toBeLessThan(paths.indexOf('*'));
    expect(paths.indexOf(DEV_COMPONENTS_PATH)).toBeLessThan(paths.indexOf('*'));
  });

  it('opens the token reference page at its address', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: [DEV_TOKENS_PATH] });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Design tokens' }),
    ).toBeInTheDocument();
  });
});
