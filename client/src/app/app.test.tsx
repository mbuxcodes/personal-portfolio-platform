import { act, render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import App from '@/app/app';
import { notificationAdded, notificationsCleared, store } from '@/state';

afterEach(() => {
  act(() => {
    store.dispatch(notificationsCleared());
  });
});

describe('App', () => {
  it('renders the page for the current address without accessibility violations', async () => {
    const { container } = render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);
  });

  it('provides the store, so a notification raised anywhere is announced', async () => {
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    act(() => {
      store.dispatch(notificationAdded('error', 'The article could not be saved.'));
    });

    expect(
      within(screen.getByRole('alert')).getByText('The article could not be saved.'),
    ).toBeInTheDocument();
  });
});
