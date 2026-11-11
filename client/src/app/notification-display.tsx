import { NotificationList } from '@/shared-ui/feedback';
import {
  notificationDismissed,
  selectNotifications,
  useAppDispatch,
  useAppSelector,
} from '@/state';

/**
 * The visible notifications, connected to the notification state (M3.3).
 *
 * It reads the list and reports a dismissal, and holds nothing of its own. It is not a live
 * region: the messages are announced by `NotificationRegion`, so each one is spoken once.
 */
export function NotificationDisplay() {
  const notifications = useAppSelector(selectNotifications);
  const dispatch = useAppDispatch();

  return (
    <NotificationList
      notifications={notifications}
      onDismiss={(id) => dispatch(notificationDismissed(id))}
    />
  );
}
