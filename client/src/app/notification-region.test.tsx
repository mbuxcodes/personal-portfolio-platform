import { act, render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { NotificationRegion } from '@/app/notification-region';
import {
  createAppStore,
  notificationAdded,
  notificationDismissed,
  notificationsCleared,
  selectNotifications,
} from '@/state';

function renderRegion() {
  const store = createAppStore();
  const view = render(
    <Provider store={store}>
      <NotificationRegion />
    </Provider>,
  );

  return { store, ...view };
}

describe('notification region', () => {
  it('is in the page before any notification, because a reader only announces a region it already has', () => {
    renderRegion();

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('announces a success message in the polite status region', () => {
    const { store } = renderRegion();

    act(() => {
      store.dispatch(notificationAdded('success', 'Project saved.'));
    });

    expect(within(screen.getByRole('status')).getByText('Project saved.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('announces a failure message in the alert region', () => {
    const { store } = renderRegion();

    act(() => {
      store.dispatch(notificationAdded('error', 'The project could not be saved.'));
    });

    expect(
      within(screen.getByRole('alert')).getByText('The project could not be saved.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('adds to the same region element, which is what makes a reader speak the new text', () => {
    const { store } = renderRegion();
    const status = screen.getByRole('status');
    const alert = screen.getByRole('alert');

    act(() => {
      store.dispatch(notificationAdded('success', 'Saved.'));
      store.dispatch(notificationAdded('error', 'Failed.'));
    });

    expect(screen.getByRole('status')).toBe(status);
    expect(screen.getByRole('alert')).toBe(alert);
  });

  it('reads only what was added, not the whole region again', () => {
    renderRegion();

    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'false');
    expect(screen.getByRole('alert')).toHaveAttribute('aria-atomic', 'false');
  });

  it('keeps earlier messages in place when another arrives', () => {
    const { store } = renderRegion();

    act(() => {
      store.dispatch(notificationAdded('success', 'First saved.'));
    });
    const first = screen.getByText('First saved.');

    act(() => {
      store.dispatch(notificationAdded('success', 'Second saved.'));
    });

    expect(screen.getByText('First saved.')).toBe(first);
    expect(screen.getByText('Second saved.')).toBeInTheDocument();
  });

  it('removes a message when it is dismissed, and all of them when cleared', () => {
    const { store } = renderRegion();

    act(() => {
      store.dispatch(notificationAdded('success', 'One.'));
      store.dispatch(notificationAdded('error', 'Two.'));
    });
    const [one] = selectNotifications(store.getState());

    act(() => {
      store.dispatch(notificationDismissed(one.id));
    });

    expect(screen.queryByText('One.')).not.toBeInTheDocument();
    expect(screen.getByText('Two.')).toBeInTheDocument();

    act(() => {
      store.dispatch(notificationsCleared());
    });

    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('is hidden from sight but not from assistive technology', () => {
    const { container } = renderRegion();

    expect(container.firstElementChild).toHaveClass('sr-only');
    expect(container.firstElementChild).not.toHaveAttribute('aria-hidden');
    expect(container.firstElementChild).not.toHaveAttribute('hidden');
  });

  it('has no detectable accessibility violations, empty or with messages', async () => {
    const { store, container } = renderRegion();

    expect((await axe(container)).violations).toEqual([]);

    act(() => {
      store.dispatch(notificationAdded('success', 'Saved.'));
      store.dispatch(notificationAdded('error', 'Failed.'));
    });

    expect((await axe(container)).violations).toEqual([]);
  });
});
