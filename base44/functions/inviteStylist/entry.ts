import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return Response.json({ error: 'Only admins can invite stylists' }, { status: 403 });
    }

    const { email, title, salonId } = await req.json();

    if (!email || !title) {
      return Response.json({ error: 'Email and title are required' }, { status: 400 });
    }

    // Invite the user — platform sends the invitation email
    // The user record is created when they register, not now
    await base44.users.inviteUser(email.trim(), 'user');

    // Build the registration link with salon_id and title params
    // These are applied to the user's profile after they complete registration
    const origin = req.headers.get('origin') || '';
    const link = `${origin}/register?email=${encodeURIComponent(email.trim())}&salon_id=${encodeURIComponent(salonId)}&title=${encodeURIComponent(title.trim())}`;

    return Response.json({ success: true, link });
  } catch (error) {
    console.error('inviteStylist error:', error);
    return Response.json({ error: error.message || 'Failed to invite stylist' }, { status: 500 });
  }
});