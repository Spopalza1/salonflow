import { chatRepository } from '@/features/chat/api/chatRepository';
import { notificationRepository } from '@/features/notifications/api/notificationRepository';
import { notificationService } from '@/features/notifications/services/notificationService';
import { orderRepository } from '@/features/orders/api/orderRepository';

export const base44Backend = {
  sendMessage: (command) => chatRepository.send(command),
  markConversationRead: (command) => chatRepository.markConversationRead(command.conversationId, command.lastSequence),
  listMessages: ({ salonId, userId, mode }) => mode === 'stylist' ? chatRepository.listForStylist(userId) : chatRepository.listForSalon(salonId),
  listNotifications: ({ salonId, userId }) => notificationRepository.listForRecipient(salonId, userId),
  transitionNotification: ({ notificationId, action }) => notificationService[action](notificationId),
  listOrders: ({ salonId }) => orderRepository.listForSalon(salonId),
};
