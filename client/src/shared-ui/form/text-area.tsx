import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/utils/class-names';
import { controlClasses } from './control-classes';
import { Field, type FieldMessages } from './field';

export interface TextAreaProps
  extends Omit<ComponentPropsWithRef<'textarea'>, 'required'>, FieldMessages {}

/** A multi-line text field with its label, hint and error. */
export function TextArea({
  label,
  hint,
  error,
  required,
  id,
  rows = 5,
  className,
  ...textAreaProps
}: TextAreaProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {(control) => (
        <textarea
          rows={rows}
          className={classNames(controlClasses(Boolean(error)), className)}
          {...control}
          {...textAreaProps}
        />
      )}
    </Field>
  );
}
