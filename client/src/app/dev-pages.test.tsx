import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { appRoutes } from '@/routing/app-routes';
import { DEV_COMPONENTS_PATH } from '@/routing/dev-routes';
import { createAppStore } from '@/state';

describe('development pages', () => {
  it('opens the component gallery at its address', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: [DEV_COMPONENTS_PATH] });
    render(
      <Provider store={createAppStore()}>
        <RouterProvider router={router} />
      </Provider>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Component gallery' }),
    ).toBeInTheDocument();
  });
});
