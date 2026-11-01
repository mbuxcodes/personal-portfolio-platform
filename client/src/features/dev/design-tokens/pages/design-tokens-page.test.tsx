import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { DesignTokensPage } from './design-tokens-page';

function renderTokensPage() {
  return render(<DesignTokensPage />);
}

describe('design tokens page', () => {
  it('renders its heading and title', async () => {
    renderTokensPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Design tokens' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.title).toBe('Design tokens | Development | Muhammad Bux Brohi'),
    );
  });

  it('shows every group of tokens', async () => {
    renderTokensPage();

    await screen.findByRole('heading', { level: 1, name: 'Design tokens' });

    for (const name of [
      'Breakpoints',
      'Colors',
      'Typography',
      'Spacing',
      'Radii',
      'Motion',
      'Focus',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('names the required color tokens', async () => {
    renderTokensPage();

    await screen.findByRole('heading', { level: 1, name: 'Design tokens' });

    for (const name of [
      'surface',
      'surface-muted',
      'text-primary',
      'text-secondary',
      'accent',
      'accent-hover',
      'danger',
      'success',
      'border',
      'focus-ring',
    ]) {
      expect(screen.getByText(name, { selector: 'span' })).toBeInTheDocument();
    }
  });

  it('keeps the heading levels in order', async () => {
    renderTokensPage();

    await screen.findByRole('heading', { level: 1, name: 'Design tokens' });

    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName[1]));

    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1);
    }
  });

  it('switches the motion examples with a native button, which the keyboard operates', async () => {
    renderTokensPage();

    const toggle = await screen.findByRole('button', { name: 'Toggle motion' });

    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('has a focusable control on every surface', async () => {
    renderTokensPage();

    const heading = await screen.findByRole('heading', { level: 2, name: 'Focus' });
    const section = heading.parentElement as HTMLElement;

    for (const name of ['On surface', 'On surface-muted', 'On surface-inverse', 'On accent']) {
      expect(within(section).getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderTokensPage();

    await screen.findByRole('heading', { level: 1, name: 'Design tokens' });

    expect((await axe(container)).violations).toEqual([]);
  });
});
