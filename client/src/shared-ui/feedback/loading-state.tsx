import { classNames } from '@/utils/class-names';

export interface LoadingStateProps {
  /** What is loading, read by screen readers. Defaults to "Loading…". */
  label?: string;
  /** `page` fills the area of a whole page. `region` fits a section of a page. */
  size?: 'page' | 'region';
}

/**
 * A loading message. It is a polite `status`, so a screen reader announces it without
 * interrupting. It has no moving graphic, so reduced motion has nothing to turn off.
 */
export function LoadingState({ label = 'Loading…', size = 'region' }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={classNames(
        'flex items-center justify-center p-8 text-text-secondary',
        size === 'page' && 'min-h-screen',
      )}
    >
      {label}
    </div>
  );
}
