import type { ReactNode } from 'react';
import { Button } from '@/shared-ui/button';
import { Heading, type HeadingLevel } from './heading';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  /** When given, a retry button is shown. A failure always offers a way forward (FR-ERR-007). */
  onRetry?: () => void;
  retryLabel?: string;
  /** Extra actions beside the retry button, such as a link to the Home page. */
  children?: ReactNode;
  /** Where the title sits in the page's heading outline. Defaults to 2. */
  headingLevel?: HeadingLevel;
}

/**
 * A friendly failure message with a retry action (FR-ERR-007). It never shows a technical
 * message: the words are chosen by the caller or the defaults. It is an `alert`, so a screen
 * reader announces it when it appears.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'This content could not be loaded. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  children,
  headingLevel = 2,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-muted p-8 text-center"
    >
      <Heading level={headingLevel}>{title}</Heading>
      <p className="max-w-prose text-text-secondary">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
        {children}
      </div>
    </div>
  );
}
