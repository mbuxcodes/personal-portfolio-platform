import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('is a button that does not submit a form unless asked', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('works with Enter and Space', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Save</Button>);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('is skipped by the keyboard when disabled', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button disabled>Off</Button>
        <Button>On</Button>
      </>,
    );

    await user.tab();

    expect(screen.getByRole('button', { name: 'On' })).toHaveFocus();
  });

  it.each(['primary', 'secondary', 'danger'] as const)(
    'has no detectable violations as %s',
    async (variant) => {
      const { container } = render(<Button variant={variant}>Action</Button>);

      expect((await axe(container)).violations).toEqual([]);
    },
  );

  it('never removes the focus outline (focus is styled once, in base.css)', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button').className).not.toMatch(/outline-none|focus:outline-hidden/);
  });
});
