import { useId, type ComponentPropsWithRef } from 'react';
import { classNames } from '@/utils/class-names';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'required'> {
  /** The visible label, shown beside the box. Clicking it toggles the box. */
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

/**
 * A single checkbox. The label sits beside the box, with the hint and error beneath it, all
 * tied to the input with `aria-describedby`. The whole label row is the click target.
 */
export function Checkbox({
  label,
  hint,
  error,
  required,
  id,
  className,
  ...inputProps
}: CheckboxProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={controlId}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          aria-required={required ? true : undefined}
          className={classNames('mt-3 size-5 shrink-0 accent-surface-inverse', className)}
          {...inputProps}
        />
        <label htmlFor={controlId} className="py-2 text-body text-text-primary">
          {label}
          {required ? (
            <>
              {' '}
              <span className="text-text-secondary">(required)</span>
            </>
          ) : null}
        </label>
      </div>
      {hint ? (
        <p id={hintId} className="pl-8 text-body-sm text-text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="pl-8 text-body-sm font-medium text-danger">
          <span className="sr-only">Error:</span> {error}
        </p>
      ) : null}
    </div>
  );
}
