import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body: { salon_id?: string } = {};
    try {
      body = await req.json();
    } catch (_error) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const salonId = String(body.salon_id || '').trim();
    if (!salonId) {
      return Response.json({ error: 'salon_id is required' }, { status: 400 });
    }

    // Guests are unauthenticated. Read public menu data with the service role,
    // but always scope every query to the salon encoded in the QR link.
    // Do not query `available: true`: legacy records may have this field unset,
    // and those items should remain visible unless explicitly set to false.
    const [rawItems, categories, optionGroups, settings] = await Promise.all([
      base44.asServiceRole.entities.MenuItem.filter(
        { salon_id: salonId },
        'display_order',
        500,
      ),
      base44.asServiceRole.entities.MenuCategory.filter(
        { salon_id: salonId },
        'display_order',
        500,
      ),
      base44.asServiceRole.entities.MenuItemOptionGroup.filter(
        { salon_id: salonId },
        'display_order',
        500,
      ),
      base44.asServiceRole.entities.SalonSetting.filter(
        { salon_id: salonId },
        '-created_date',
        10,
      ),
    ]);

    const items = rawItems.filter((item) => item.available !== false);

    return Response.json({
      salon_id: salonId,
      items,
      categories,
      option_groups: optionGroups,
      settings: settings[0] || null,
    });
  } catch (error) {
    console.error('getGuestMenu error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load menu' },
      { status: 500 },
    );
  }
});
