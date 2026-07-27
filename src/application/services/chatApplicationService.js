import { getBackend } from '../backend';

const uuid = () => globalThis.crypto?.randomUUID?.() || `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const chatApplicationService = {
  send(command) {
    return getBackend().sendMessage({ ...command, client_message_id: command.client_message_id || uuid() });
  },
  markRead(command) { return getBackend().markConversationRead(command); },
  list(query) { return getBackend().listMessages(query); },
};
