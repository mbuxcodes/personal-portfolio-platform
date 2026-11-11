import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './checkbox';
import { Select } from './select';
import { TextArea } from './text-area';
import { TextInput } from './text-input';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

describe('form fields', () => {
  it('ties the label to the control', () => {
    render(<TextInput label="Name" />);

    expect(screen.getByLabelText('Name')).toBeInstanceOf(HTMLInputElement);
  });

  it('ties the hint and the error to the control with aria-describedby', () => {
    render(<TextInput label="Email" hint="Use your work address." error="Enter a valid email." />);

    const input = screen.getByLabelText('Email');

    expect(input).toHaveAccessibleDescription('Use your work address. Error: Enter a valid email.');
    expect(input).toBeInvalid();
  });

  it('marks a control with no error as valid and without a description', () => {
    render(<TextInput label="Email" />);

    const input = screen.getByLabelText('Email');

    expect(input).toBeValid();
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('says in words and to assistive technology that a field is required', () => {
    render(<TextInput label="Name" required />);

    const input = screen.getByRole('textbox', { name: 'Name (required)' });

    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('gives an error state that is not only a color (thicker edge plus text)', () => {
    render(<TextInput label="Name" error="Required." />);

    expect(screen.getByLabelText('Name').className).toContain('border-2');
    expect(screen.getByText('Required.')).toBeVisible();
  });

  it('passes native attributes and a ref through', () => {
    render(<TextInput label="Name" type="email" name="email" defaultValue="a@b.c" />);

    const input = screen.getByLabelText('Name');

    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveValue('a@b.c');
  });

  it('builds a text area, a select and a checkbox with the same relationships', () => {
    render(
      <>
        <TextArea label="Message" hint="Hint one" />
        <Select label="Choice" options={options} placeholder="Pick one" error="Pick one." />
        <Checkbox label="Agree" hint="Hint two" error="Must agree." />
      </>,
    );

    expect(screen.getByLabelText('Message')).toHaveAccessibleDescription('Hint one');
    expect(screen.getByLabelText('Choice')).toHaveAccessibleDescription('Error: Pick one.');
    expect(screen.getByLabelText('Agree')).toHaveAccessibleDescription(
      'Hint two Error: Must agree.',
    );
    expect(screen.getByRole('option', { name: 'Pick one' })).toBeInTheDocument();
  });

  it('can be filled in and changed with the keyboard alone', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TextInput label="Name" />
        <TextArea label="Message" />
        <Select label="Choice" options={options} />
        <Checkbox label="Agree" />
      </>,
    );

    await user.tab();
    expect(screen.getByLabelText('Name')).toHaveFocus();
    await user.keyboard('Ada');
    await user.tab();
    expect(screen.getByLabelText('Message')).toHaveFocus();
    await user.keyboard('Hello');
    await user.tab();
    expect(screen.getByLabelText('Choice')).toHaveFocus();
    await user.selectOptions(screen.getByLabelText('Choice'), 'b');
    await user.tab();
    expect(screen.getByLabelText('Agree')).toHaveFocus();
    await user.keyboard(' ');

    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
    expect(screen.getByLabelText('Message')).toHaveValue('Hello');
    expect(screen.getByLabelText('Choice')).toHaveValue('b');
    expect(screen.getByLabelText('Agree')).toBeChecked();
  });

  it('toggles the checkbox when its label is clicked', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Agree" />);

    await user.click(screen.getByText('Agree'));

    expect(screen.getByLabelText('Agree')).toBeChecked();
  });

  it('keeps ids unique when several fields are on one page', () => {
    render(
      <>
        <TextInput label="One" />
        <TextInput label="Two" />
      </>,
    );

    expect(screen.getByLabelText('One').id).not.toBe(screen.getByLabelText('Two').id);
  });

  it('has no detectable violations, with and without errors', async () => {
    const { container } = render(
      <form>
        <TextInput label="Name" hint="Hint" required />
        <TextInput label="Email" error="Bad email." />
        <TextArea label="Message" error="Too long." />
        <Select label="Choice" options={options} error="Pick one." />
        <Checkbox label="Agree" hint="Hint" error="Must agree." required />
      </form>,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
