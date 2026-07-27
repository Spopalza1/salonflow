import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (request) => {
  try {
    const base44 = createClientFromRequest(request);
    const user = await base44.auth.me();
    if (!user?.id || !user?.salon_id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const input = await request.json();
    if (!input.body?.trim() && !input.media_url) return Response.json({ error: 'Message content is required' }, { status: 400 });
    if (!input.thread_partner_id) return Response.json({ error: 'Recipient is required' }, { status: 400 });

    let conversation = input.conversation_id ? (await base44.entities.Conversation.filter({ id: input.conversation_id, salon_id: user.salon_id }, '-created_date', 1))?.[0] : null;
    if (!conversation) {
      const existing = await base44.entities.Conversation.filter({ salon_id: user.salon_id, legacy_partner_id: input.thread_partner_id, type: 'direct' }, '-created_date', 1);
      conversation = existing?.[0] || await base44.asServiceRole.entities.Conversation.create({ salon_id: user.salon_id, type: 'direct', legacy_partner_id: input.thread_partner_id, last_sequence: 0 });
    }
    const sequence = Number(conversation.last_sequence || 0) + 1;
    const message = await base44.asServiceRole.entities.Message.create({
      ...input,
      salon_id: user.salon_id,
      sender_id: user.id,
      sender_name: user.full_name || input.sender_name || 'Team member',
      sender_role: user.role,
      conversation_id: conversation.id,
      client_message_id: input.client_message_id || crypto.randomUUID(),
      sequence,
      delivered_at: new Date().toISOString(),
      read: false
    });
    await base44.asServiceRole.entities.Conversation.update(conversation.id, { last_message_id: message.id, last_sequence: sequence });
    await base44.functions.invoke('createMessageNotifications', { message_id: message.id });
    return Response.json({ message, conversation });
  } catch (error) {
    return Response.json({ error: error?.message || 'Unable to send message' }, { status: 500 });
  }
});
