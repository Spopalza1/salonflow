import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { JsonStore } from './store.mjs';

const port = Number(process.env.SALONFLOW_LOCAL_PORT || 4317);
const dataDir = process.env.SALONFLOW_DATA_DIR || path.join(os.homedir(), '.salonflow');
const store = new JsonStore(path.join(dataDir, 'salonflow.json'));
const clients = new Set();
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(body)); };
const body = (req) => new Promise((resolve, reject) => { let raw=''; req.on('data', c => raw += c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } }); });
const emit = (event) => { const payload = `data: ${JSON.stringify(event)}\n\n`; for (const res of clients) res.write(payload); };

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,x-user-id,x-salon-id,x-user-role' }); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = req.headers['x-user-id'];
  const salonId = req.headers['x-salon-id'];
  if (url.pathname === '/health') return json(res, 200, { ok: true, mode: 'local', version: 1 });
  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': '*' });
    clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  if (!userId || !salonId) return json(res, 401, { error: 'Missing local session headers' });

  if (req.method === 'GET' && url.pathname === '/messages') {
    return json(res, 200, store.list('messages', row => String(row.salon_id) === String(salonId)));
  }
  if (req.method === 'POST' && url.pathname === '/messages') {
    const input = await body(req);
    const conversationId = input.conversation_id || `direct:${salonId}:${input.thread_partner_id}`;
    const existing = store.list('messages', row => row.conversation_id === conversationId);
    const message = store.insert('messages', { ...input, id: randomUUID(), salon_id: salonId, sender_id: userId, sender_role: req.headers['x-user-role'] || input.sender_role, conversation_id: conversationId, client_message_id: input.client_message_id || randomUUID(), sequence: existing.length + 1, created_date: new Date().toISOString(), delivered_at: new Date().toISOString(), read: false });
    emit({ entity: 'Message', type: 'create', data: message });
    return json(res, 201, message);
  }
  if (req.method === 'POST' && url.pathname === '/conversations/read') {
    const input = await body(req);
    const id = `${input.conversation_id}:${userId}`;
    const existing = store.list('participants', row => row.id === id)[0];
    const value = existing ? store.update('participants', id, { last_read_sequence: input.last_sequence, last_read_at: new Date().toISOString() }) : store.insert('participants', { id, salon_id: salonId, conversation_id: input.conversation_id, user_id: userId, last_read_sequence: input.last_sequence, last_read_at: new Date().toISOString() });
    emit({ entity: 'ConversationParticipant', type: existing ? 'update' : 'create', data: value });
    return json(res, 200, value);
  }
  if (req.method === 'GET' && url.pathname === '/notifications') return json(res, 200, store.list('notifications', row => String(row.salon_id) === String(salonId) && String(row.recipient_user_id) === String(userId)));
  if (req.method === 'GET' && url.pathname === '/orders') return json(res, 200, store.list('orders', row => String(row.salon_id) === String(salonId)));
  return json(res, 404, { error: 'Not found' });
});
server.listen(port, '0.0.0.0', () => console.log(`SalonFlow local server listening on http://0.0.0.0:${port}`));
