import type { ReactNode } from 'react';
import { Heading, type HeadingLevel } from './heading';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** An optional next step, such as a button or a link. */
  action?: ReactNode;
  /** Where the title sits in the page's heading outline. Defaults to 2. */
  headingLevel?: HeadingLevel;
}

/**
 * Shown where a list has no entries (FR-SITE-003): a short, neutral message. It is not an
 * error, so it uses no alert role and no danger color.
 */
export function EmptyState({ title, description, action, headingLevel = 2 }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-surface-muted p-8 text-center">
      <Heading level={headingLevel}>{title}</Heading>
      {description ? <p className="max-w-prose text-text-secondary">{description}</p> : null}
      {action}
    </div>
  );
}
