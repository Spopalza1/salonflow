import { invokeServerFunction } from '@/shared/api/base44Repository';
export const notificationService = {
  markRead(notificationId) { return invokeServerFunction('updateNotificationState', { notification_id: notificationId, action: 'read' }); },
  open(notificationId) { return invokeServerFunction('updateNotificationState', { notification_id: notificationId, action: 'opened' }); },
  dismiss(notificationId) { return invokeServerFunction('updateNotificationState', { notification_id: notificationId, action: 'dismissed' }); },
};
