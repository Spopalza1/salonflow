const headersFor = (session) => ({ 'content-type': 'application/json', 'x-user-id': session.userId, 'x-salon-id': session.salonId, 'x-user-role': session.role || '' });
export function createLocalBackend({ baseUrl = 'http://127.0.0.1:4317', session }) {
  const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...headersFor(session()), ...options.headers } });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `Local API ${response.status}`);
    return response.json();
  };
  return {
    sendMessage: (command) => request('/messages', { method: 'POST', body: JSON.stringify(command) }),
    markConversationRead: (command) => request('/conversations/read', { method: 'POST', body: JSON.stringify({ conversation_id: command.conversationId, last_sequence: command.lastSequence }) }),
    listMessages: () => request('/messages'),
    listNotifications: () => request('/notifications'),
    listOrders: () => request('/orders'),
    subscribe(handler) {
      const stream = new EventSource(`${baseUrl}/events`);
      stream.onmessage = (event) => handler(JSON.parse(event.data));
      return () => stream.close();
    },
  };
}
