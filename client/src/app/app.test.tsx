import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import App from '@/app/app';

describe('App', () => {
  it('renders the application heading without accessibility violations', async () => {
    const { container } = render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Personal Portfolio Platform' }),
    ).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);
  });
});
