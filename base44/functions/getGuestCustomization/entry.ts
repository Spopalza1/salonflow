import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { salon_id } = body;

    if (!salon_id) {
      return Response.json({ error: 'salon_id is required' }, { status: 400 });
    }

    // Service role bypasses RLS so unauthenticated guests can read salon customization.
    // Safe because the data is public branding/theme config (colors, fonts, logo, background media).
    const data = await base44.asServiceRole.entities.SalonCustomization.filter(
      { salon_id },
      '-updated_date',
      1
    );

    return Response.json({ customization: data.length > 0 ? data[0] : null });
  } catch (error) {
    console.error('getGuestCustomization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});