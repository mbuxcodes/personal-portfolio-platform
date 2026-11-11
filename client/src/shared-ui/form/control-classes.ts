import { classNames } from '@/utils/class-names';

/**
 * The look shared by the text input, text area and select. The edge uses `border-strong`, which
 * meets the 3:1 rule for control edges. An invalid control gets a thicker edge in the danger
 * color, and the error text next to it says why, so color is never the only signal.
 */
export function controlClasses(hasError: boolean): string {
  return classNames(
    'block min-h-12 w-full rounded-md bg-surface px-3 py-2 text-body text-text-primary',
    hasError ? 'border-2 border-danger' : 'border border-border-strong',
    'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary',
  );
}
