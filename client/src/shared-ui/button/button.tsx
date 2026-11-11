import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/utils/class-names';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  /** `primary` is the one main action. `danger` is for destructive actions. */
  variant?: ButtonVariant;
}

// Each pair of colors is one of the measured pairs in docs/DESIGN_SYSTEM.md Section 4.
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-text-on-accent hover:bg-accent-hover',
  secondary: 'border border-border-strong bg-surface text-text-primary hover:bg-surface-muted',
  danger: 'bg-danger text-text-on-status hover:underline',
};

/**
 * The one button of the application. It is a real `button`, so Enter and Space work and focus
 * is visible through the base focus style. The type defaults to `button`, so a button inside a
 * form never submits it by accident. Controls are at least 48px high for touch (FR-RESP-004).
 */
export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={classNames(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 py-2',
        'text-body font-semibold transition-colors duration-fast ease-standard',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
