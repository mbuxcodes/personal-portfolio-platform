import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';
import { NotificationDisplay } from '@/app/notification-display';
import { NotificationRegion } from '@/app/notification-region';
import { createAppStore, notificationAdded } from '@/state';

afterEach(() => {
  document.body.innerHTML = '';
});

function renderWithStore() {
  const store = createAppStore();

  render(
    <Provider store={store}>
      <NotificationDisplay />
      <NotificationRegion />
    </Provider>,
  );

  return store;
}

describe('NotificationDisplay', () => {
  it('shows nothing while the notification state is empty', () => {
    renderWithStore();

    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('shows a message that is added to the state', () => {
    const store = renderWithStore();

    act(() => {
      store.dispatch(notificationAdded('success', 'Project saved.'));
    });

    expect(
      within(screen.getByRole('region', { name: 'Notifications' })).getByText('Project saved.'),
    ).toBeInTheDocument();
  });

  it('removes a message from the state when it is dismissed', async () => {
    const user = userEvent.setup();
    const store = renderWithStore();

    act(() => {
      store.dispatch(notificationAdded('error', 'Could not save.'));
    });
    await user.click(screen.getByRole('button', { name: 'Dismiss: Could not save.' }));

    expect(store.getState().notifications).toEqual([]);
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('announces each message once: the live regions speak, the visible list does not', () => {
    const store = renderWithStore();

    act(() => {
      store.dispatch(notificationAdded('error', 'Could not save.'));
    });

    expect(screen.getAllByText('Could not save.')).toHaveLength(2);
    expect(within(screen.getByRole('alert')).getByText('Could not save.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Notifications' })).queryByRole('alert'),
    ).not.toBeInTheDocument();
  });

  it('holds only text in the state, never server data', () => {
    const store = renderWithStore();

    act(() => {
      store.dispatch(notificationAdded('success', 'Saved.'));
    });

    expect(Object.keys(store.getState().notifications[0] ?? {}).sort()).toEqual([
      'id',
      'kind',
      'message',
    ]);
  });

  it('has no detectable violations with messages showing', async () => {
    const store = renderWithStore();

    act(() => {
      store.dispatch(notificationAdded('success', 'Saved.'));
      store.dispatch(notificationAdded('error', 'Failed.'));
    });

    expect((await axe(document.body)).violations).toEqual([]);
  });
});
