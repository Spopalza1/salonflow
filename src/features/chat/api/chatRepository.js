import { createBase44Repository, invokeServerFunction } from '@/shared/api/base44Repository';
const messages = createBase44Repository('Message');

export const chatRepository = {
  listForStylist(userId) { return messages.list({ thread_partner_id: userId }, 'created_date'); },
  listForSalon(salonId, limit = 500) { return messages.list({ salon_id: salonId }, 'created_date', limit); },
  send(payload) { return invokeServerFunction('sendMessage', payload).then((result) => result.data?.message || result.message); },
  updateMessage(id, patch) { return messages.update(id, patch); },
  deleteMessage(id) { return messages.remove(id); },
  deleteConversation(filter) { return messages.removeMany(filter); },
  subscribe(handler) { return messages.subscribe(handler); },
  notifyRecipients(messageId) { return invokeServerFunction('createMessageNotifications', { message_id: messageId }); },
  markConversationRead(conversationId, lastSequence) { return invokeServerFunction('markConversationRead', { conversation_id: conversationId, last_sequence: lastSequence }); },
  listSalonStylists() { return invokeServerFunction('getSalonStylists', {}); },
};
