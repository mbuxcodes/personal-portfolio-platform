import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/utils/class-names';
import { controlClasses } from './control-classes';
import { Field, type FieldMessages } from './field';

export interface TextInputProps
  extends Omit<ComponentPropsWithRef<'input'>, 'required'>, FieldMessages {}

/** A one-line text field with its label, hint and error. Pass `type` for email, password, etc. */
export function TextInput({
  label,
  hint,
  error,
  required,
  id,
  type = 'text',
  className,
  ...inputProps
}: TextInputProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {(control) => (
        <input
          type={type}
          className={classNames(controlClasses(Boolean(error)), className)}
          {...control}
          {...inputProps}
        />
      )}
    </Field>
  );
}
