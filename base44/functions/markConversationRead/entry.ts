import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
Deno.serve(async (request) => {
  try {
    const base44 = createClientFromRequest(request);
    const user = await base44.auth.me();
    if (!user?.id || !user?.salon_id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { conversation_id, last_sequence = 0 } = await request.json();
    const rows = await base44.entities.ConversationParticipant.filter({ salon_id: user.salon_id, conversation_id, user_id: user.id }, '-created_date', 1);
    const patch = { last_read_sequence: Number(last_sequence), last_read_at: new Date().toISOString(), hidden_at: null };
    const participant = rows?.[0]
      ? await base44.asServiceRole.entities.ConversationParticipant.update(rows[0].id, patch)
      : await base44.asServiceRole.entities.ConversationParticipant.create({ salon_id: user.salon_id, conversation_id, user_id: user.id, participant_role: user.role, ...patch });
    return Response.json({ participant });
  } catch (error) {
    return Response.json({ error: error?.message || 'Unable to mark conversation read' }, { status: 500 });
  }
});
