import { PageErrorFallback } from '@/shared-ui/error-boundary';

/**
 * The frame shown when a route fails outside any other layout: a page that could not be loaded,
 * or an error that reached the top of the router (FR-ERR-007). It is a whole page with its own
 * `main` and `h1`, a retry, and a way home. Reloading is the retry, because the cause may be a
 * file that failed to download. The error itself is never shown to the visitor.
 */
export function ErrorPageLayout() {
  return <PageErrorFallback onRetry={() => window.location.reload()} />;
}
