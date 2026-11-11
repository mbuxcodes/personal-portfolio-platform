import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/shared-ui/feedback';

interface BoundaryProps {
  children: ReactNode;
  /** Draws the failure. `retry` clears the error and renders the children again. */
  fallback: (retry: () => void) => ReactNode;
  /** When this value changes, the error is cleared. Pass the current address. */
  resetKey?: unknown;
  /** Called once with the error, for logging. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface BoundaryState {
  hasError: boolean;
}

/**
 * React only catches rendering errors in a class component, so the two boundaries below share
 * this one. It never shows the error itself: the fallback chooses the words.
 */
class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previous: BoundaryProps) {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.retry();
    }
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    return this.state.hasError ? this.props.fallback(this.retry) : this.props.children;
  }
}

export interface PageErrorFallbackProps {
  onRetry: () => void;
  /** Where "Go to the home page" leads. */
  homeHref?: string;
}

/**
 * The whole-page failure (FR-ERR-007). It is a full page with its own `main` and `h1`, so it is
 * never a blank page, and it offers both a retry and a way out. The link is a plain address, not
 * a router link, so it also works when the router itself is what failed.
 */
export function PageErrorFallback({ onRetry, homeHref = '/' }: PageErrorFallbackProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-4 tablet:p-8">
      <ErrorState
        headingLevel={1}
        title="This page ran into a problem"
        message="Something went wrong while showing this page. Try again, or go back to the home page."
        onRetry={onRetry}
      >
        <a href={homeHref}>Go to the home page</a>
      </ErrorState>
    </main>
  );
}

export interface PageErrorBoundaryProps {
  children: ReactNode;
  resetKey?: unknown;
  onError?: (error: Error, info: ErrorInfo) => void;
}

/** Catches a rendering error anywhere below it and shows a full-page failure with retry. */
export function PageErrorBoundary({ children, resetKey, onError }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKey={resetKey}
      onError={onError}
      fallback={(retry) => <PageErrorFallback onRetry={retry} />}
    >
      {children}
    </ErrorBoundary>
  );
}

export interface RegionErrorBoundaryProps {
  children: ReactNode;
  resetKey?: unknown;
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Names what failed, for example "the project list". Used in the message. */
  regionName?: string;
}

/**
 * Catches a rendering error in one part of a page and shows a failure message in its place,
 * so the rest of the page, including the navigation, keeps working.
 */
export function RegionErrorBoundary({
  children,
  resetKey,
  onError,
  regionName = 'this section',
}: RegionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKey={resetKey}
      onError={onError}
      fallback={(retry) => (
        <ErrorState
          message={`Something went wrong while showing ${regionName}. Please try again.`}
          onRetry={retry}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
