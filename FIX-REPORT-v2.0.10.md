# SalonFlow v2.0.10 — Chat Notifications & Stylist Notification Preview

## Message notification delivery
- Reworked `createMessageNotifications` to normalize Base44 user fields stored either at the root or under `data`.
- Admin-to-stylist delivery now resolves the exact `thread_partner_id` recipient reliably.
- Stylist-to-admin delivery now resolves every admin in the same salon reliably.
- Salon ownership checks now use normalized salon IDs.
- Notification records continue to be created with service-role permissions, so recipients do not need to be readable by the sender.
- Chat sending now waits for the notification function response and logs a useful warning when no recipient can be found.

## Stylist notification centre only
- Stylist/user-role accounts now get a dedicated simplified preview.
- It always previews all notifications; admin filters and search are not shown.
- Notifications are bundled into separate origin-based stacks, such as Front Desk chat, services, orders, or system sources.
- Admin notification-centre layout remains unchanged.

## Deployment requirement
Deploy the complete project, including `base44/functions/createMessageNotifications/entry.ts`. A frontend-only deployment will not apply the notification delivery fix.
