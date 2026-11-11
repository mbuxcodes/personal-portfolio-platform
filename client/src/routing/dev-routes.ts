import type { RouteObject } from 'react-router';

/** The address of the design token reference page. It exists in development only. */
export const DEV_TOKENS_PATH = '/dev/tokens';

/** The address of the shared component gallery. It exists in development only. */
export const DEV_COMPONENTS_PATH = '/dev/components';

/**
 * Pages for developers, available only when the client runs in development.
 *
 * In a production build `import.meta.env.DEV` is replaced by `false`, so the list is empty and
 * the bundler leaves the pages out of the build entirely. The server has no matching address, so
 * a visitor to the live site gets the not-found page.
 */
export const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: DEV_TOKENS_PATH,
        lazy: async () => ({
          Component: (await import('@/features/dev/design-tokens')).DesignTokensPage,
        }),
      },
      {
        path: DEV_COMPONENTS_PATH,
        lazy: async () => ({
          Component: (await import('@/features/dev/component-gallery')).ComponentGalleryPage,
        }),
      },
    ]
  : [];
