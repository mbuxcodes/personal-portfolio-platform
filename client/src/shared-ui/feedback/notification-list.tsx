import { useRef } from 'react';
import { Animate } from '@/shared-ui/animate';
import { Button } from '@/shared-ui/button';
import { MAIN_CONTENT_ID } from '@/shared-ui/skip-link';

/** One visible message. It has the same shape as the notifications in the client state. */
export interface NotificationListItem {
  id: string;
  kind: 'success' | 'error';
  message: string;
}

export interface NotificationListProps {
  notifications: readonly NotificationListItem[];
  onDismiss: (id: string) => void;
}

/**
 * The visible notifications. It only draws what it is given: the application shell connects it
 * to the notification state (`app/notification-display.tsx`).
 *
 * It is NOT a live region. The messages are announced by the live regions of `NotificationRegion`
 * (M3.3), and a second announcement would read each message twice. A message stays until it is
 * dismissed, because a message that disappears on a timer can be missed (WCAG 2.2.1).
 *
 * When a message is dismissed, focus moves to a neighbouring message, or to the main region when
 * none is left, so a keyboard user does not lose their place.
 */
export function NotificationList({ notifications, onDismiss }: NotificationListProps) {
  const listRef = useRef<HTMLUListElement>(null);

  if (notifications.length === 0) {
    return null;
  }

  function dismiss(id: string, position: number) {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [];
    const next = buttons[position + 1] ?? buttons[position - 1];

    (next ?? document.getElementById(MAIN_CONTENT_ID))?.focus();
    onDismiss(id);
  }

  return (
    <section
      aria-label="Notifications"
      className="fixed inset-x-4 bottom-4 z-50 tablet:inset-x-auto tablet:right-4 tablet:w-1/2 desktop:w-1/3"
    >
      <ul ref={listRef} className="flex flex-col gap-2">
        {notifications.map((notification, position) => (
          <Animate
            key={notification.id}
            as="li"
            pattern="rise"
            className="flex items-start justify-between gap-4 rounded-md border border-border-strong bg-surface p-4"
          >
            <p className="text-text-primary">
              {notification.kind === 'error' ? (
                <strong className="text-danger">Error: </strong>
              ) : (
                <strong className="text-success">Success: </strong>
              )}
              {notification.message}
            </p>
            <Button
              variant="secondary"
              aria-label={`Dismiss: ${notification.message}`}
              onClick={() => dismiss(notification.id, position)}
            >
              Dismiss
            </Button>
          </Animate>
        ))}
      </ul>
    </section>
  );
}
