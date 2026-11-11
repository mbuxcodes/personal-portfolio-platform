import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

/** Renders a layout around a page with one `h1`, at an address, inside a data router. */
export function renderLayout(layout: (children: ReactNode) => ReactNode, path = '/') {
  const router = createMemoryRouter([{ path: '*', element: layout(<h1>Page heading</h1>) }], {
    initialEntries: [path],
  });

  return { router, ...render(<RouterProvider router={router} />) };
}
