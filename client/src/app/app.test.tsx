import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import App from '@/app/app';

describe('App', () => {
  it('renders the page for the current address without accessibility violations', async () => {
    const { container } = render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);
  });
});
