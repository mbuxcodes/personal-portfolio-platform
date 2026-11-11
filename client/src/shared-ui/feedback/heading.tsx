import type { ReactNode } from 'react';

export type HeadingLevel = 1 | 2 | 3 | 4;

const tags = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' } as const;

/**
 * A heading whose level the caller chooses, so a state can sit at the right place in the page's
 * heading outline (FR-A11Y-004). The visual size always follows the base heading styles.
 */
export function Heading({ level, children }: { level: HeadingLevel; children: ReactNode }) {
  const Tag = tags[level];

  return <Tag>{children}</Tag>;
}
