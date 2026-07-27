import { getBackend } from '../backend';
export const notificationApplicationService = {
  list(query) { return getBackend().listNotifications(query); },
  markRead(notificationId) { return getBackend().transitionNotification({ notificationId, action: 'markRead' }); },
  open(notificationId) { return getBackend().transitionNotification({ notificationId, action: 'open' }); },
  dismiss(notificationId) { return getBackend().transitionNotification({ notificationId, action: 'dismiss' }); },
};
