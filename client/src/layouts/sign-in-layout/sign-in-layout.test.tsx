import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { renderLayout } from '../layout-test-utils';
import { SignInLayout } from './sign-in-layout';

const renderSignIn = () =>
  renderLayout((page) => <SignInLayout>{page}</SignInLayout>, '/admin/sign-in');

describe('SignInLayout', () => {
  it('puts the page in a single main region with exactly one h1', () => {
    renderSignIn();

    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { level: 1, name: 'Page heading' }),
    );
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  it('has no navigation, because the Admin area is never linked from outside', () => {
    renderSignIn();

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('centers a card that fills a phone and has a maximum width on larger screens', () => {
    renderSignIn();

    const main = screen.getByRole('main');

    expect(main.className).toContain('m-auto');
    expect(main.className).toContain('w-full');
    expect(main.className).toContain('max-w-md');
  });

  it('starts keyboard use at the skip link', async () => {
    const user = userEvent.setup();
    renderSignIn();

    await user.tab();

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();
  });

  it('has no detectable violations', async () => {
    const { container } = renderSignIn();

    expect((await axe(container)).violations).toEqual([]);
  });
});
