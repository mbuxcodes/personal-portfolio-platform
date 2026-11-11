import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { MAIN_CONTENT_ID } from '@/shared-ui/skip-link';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';
import { NotificationList, type NotificationListItem } from './notification-list';

describe('EmptyState', () => {
  it('shows a neutral message with no alert role', () => {
    render(<EmptyState title="No projects yet" description="Check back soon." />);

    expect(screen.getByRole('heading', { level: 2, name: 'No projects yet' })).toBeInTheDocument();
    expect(screen.getByText('Check back soon.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lets the page choose the heading level and add an action', () => {
    render(<EmptyState title="Nothing here" headingLevel={3} action={<a href="/">Go home</a>} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toBeInTheDocument();
  });

  it('has no detectable violations', async () => {
    const { container } = render(<EmptyState title="No projects yet" description="Soon." />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('LoadingState', () => {
  it('is a polite status with a readable label', () => {
    render(<LoadingState label="Loading projects…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading projects…');
  });

  it('has a default label and no detectable violations', async () => {
    const { container } = render(<LoadingState size="page" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('ErrorState', () => {
  it('is an alert with a friendly default message and no technical detail', () => {
    render(<ErrorState />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again.');
  });

  it('offers a retry that works from the keyboard', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState onRetry={onRetry} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows no retry button when there is nothing to retry, and keeps extra actions', () => {
    render(
      <ErrorState message="Gone." retryLabel="Again">
        <a href="/">Home</a>
      </ErrorState>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });

  it('has no detectable violations', async () => {
    const { container } = render(<ErrorState onRetry={vi.fn()} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

const notifications: NotificationListItem[] = [
  { id: 'a', kind: 'success', message: 'Project saved.' },
  { id: 'b', kind: 'error', message: 'Could not save the skill.' },
  { id: 'c', kind: 'success', message: 'Skill removed.' },
];

describe('NotificationList', () => {
  it('draws nothing when there are no notifications', () => {
    const { container } = render(<NotificationList notifications={[]} onDismiss={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows each message with its kind in words', () => {
    render(<NotificationList notifications={notifications} onDismiss={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Project saved.').closest('p')).toHaveTextContent(
      'Success: Project saved.',
    );
    expect(screen.getByText('Could not save the skill.').closest('p')).toHaveTextContent(
      'Error: Could not save the skill.',
    );
  });

  it('is not a live region, because NotificationRegion announces the messages', () => {
    render(<NotificationList notifications={notifications} onDismiss={vi.fn()} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reports a dismissal and moves focus to the next message', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<NotificationList notifications={notifications} onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Dismiss: Project saved.' }));

    expect(onDismiss).toHaveBeenCalledWith('a');
    expect(
      screen.getByRole('button', { name: 'Dismiss: Could not save the skill.' }),
    ).toHaveFocus();
  });

  it('moves focus to the previous message when the last one is dismissed', async () => {
    const user = userEvent.setup();
    render(<NotificationList notifications={notifications} onDismiss={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Dismiss: Skill removed.' }));

    expect(
      screen.getByRole('button', { name: 'Dismiss: Could not save the skill.' }),
    ).toHaveFocus();
  });

  it('moves focus to the main region when the only message is dismissed', async () => {
    const user = userEvent.setup();
    render(
      <>
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>
          Page
        </main>
        <NotificationList notifications={[notifications[0]!]} onDismiss={vi.fn()} />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Dismiss: Project saved.' }));

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('has no detectable violations', async () => {
    const { container } = render(
      <NotificationList notifications={notifications} onDismiss={vi.fn()} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
