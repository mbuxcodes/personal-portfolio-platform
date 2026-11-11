import { useId, type ReactNode } from 'react';

/** The text a field shows around its control. */
export interface FieldMessages {
  /** The visible label. Every control has one (FR-A11Y-006). */
  label: string;
  /** Help shown under the label, read with the control. */
  hint?: string;
  /** The reason the value is not accepted. Setting it marks the control invalid. */
  error?: string;
  /** Marks the control as required, in words and for assistive technology. */
  required?: boolean;
}

/** What the control element must receive so the label, hint and error are tied to it. */
export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

interface FieldProps extends FieldMessages {
  /** Use when the page needs a known id. Otherwise one is made. */
  id?: string;
  /** Receives the props to spread on the control element. */
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * The wrapper every form control sits in: a label, optional hint text, and an optional error
 * message. The label is tied to the control by `for` and `id`. The hint and the error are tied
 * to it by `aria-describedby`, so a screen reader reads them with the control. An error also
 * sets `aria-invalid`.
 */
export function Field({ id, label, hint, error, required, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={controlId} className="text-body font-medium text-text-primary">
        {label}
        {required ? (
          <>
            {' '}
            <span className="font-regular text-text-secondary">(required)</span>
          </>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-body-sm text-text-secondary">
          {hint}
        </p>
      ) : null}
      {children({
        id: controlId,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {error ? (
        <p id={errorId} className="text-body-sm font-medium text-danger">
          <span className="sr-only">Error:</span> {error}
        </p>
      ) : null}
    </div>
  );
}
