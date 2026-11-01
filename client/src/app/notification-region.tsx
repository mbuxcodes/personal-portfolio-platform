import { selectNotifications, useAppSelector } from '@/state';

/**
 * The live regions that announce notifications to screen readers (FR-ADMIN-GEN-001).
 *
 * - Success messages go to a polite `status` region: read when the reader is idle.
 * - Failure messages go to an `alert` region: read at once.
 *
 * Both regions are always in the page, even when empty. A screen reader announces text that
 * is added to a region it already knows, so a region that appears together with its text can
 * stay silent. Only the added message is read (`aria-atomic="false"`).
 *
 * The regions are hidden from sight with `sr-only`. M3.5 builds the visible notification display
 * from the same state, so this component only has to speak the messages.
 */
export function NotificationRegion() {
  const notifications = useAppSelector(selectNotifications);

  return (
    <div className="sr-only">
      <div role="status" aria-atomic="false">
        {notifications
          .filter((notification) => notification.kind === 'success')
          .map((notification) => (
            <p key={notification.id}>{notification.message}</p>
          ))}
      </div>
      <div role="alert" aria-atomic="false">
        {notifications
          .filter((notification) => notification.kind === 'error')
          .map((notification) => (
            <p key={notification.id}>{notification.message}</p>
          ))}
      </div>
    </div>
  );
}
