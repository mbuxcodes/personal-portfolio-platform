import type { ComponentPropsWithRef } from 'react';
import { classNames } from '@/utils/class-names';
import { controlClasses } from './control-classes';
import { Field, type FieldMessages } from './field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<ComponentPropsWithRef<'select'>, 'required' | 'children'>, FieldMessages {
  options: SelectOption[];
  /** Text of an empty first option, for a choice the person has not made yet. */
  placeholder?: string;
}

/**
 * A choice from a list, built on the browser's own `select`. The native control gives the
 * keyboard behavior, the touch picker and the screen reader support for free.
 */
export function Select({
  label,
  hint,
  error,
  required,
  id,
  options,
  placeholder,
  className,
  ...selectProps
}: SelectProps) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {(control) => (
        <select
          className={classNames(controlClasses(Boolean(error)), className)}
          {...control}
          {...selectProps}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
