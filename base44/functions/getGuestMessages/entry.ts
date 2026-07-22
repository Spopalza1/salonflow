import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { salon_id, guest_session } = body;

    if (!salon_id || !guest_session) {
      return Response.json({ error: 'salon_id and guest_session are required' }, { status: 400 });
    }

    // Service role bypasses RLS so unauthenticated guests can read their own chat thread.
    // Safe because both salon_id AND guest_session must match — a guest can only see their own messages.
    const messages = await base44.asServiceRole.entities.GuestMessage.filter(
      { salon_id, guest_session },
      'created_date',
      200
    );

    return Response.json({ messages });
  } catch (error) {
    console.error('getGuestMessages error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});