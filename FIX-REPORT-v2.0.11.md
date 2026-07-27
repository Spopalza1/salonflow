# SalonFlow v2.0.11 — Reliable In-App Notifications

## Fixed

- Incoming admin/stylist chat messages now create an in-app notification for the recipient.
- Added a five-second recovery reconciliation so a dropped or delayed Base44 realtime event cannot leave chat updated without updating the notification centre.
- Reconciliation checks notification idempotency before creating anything, so dismissed notifications stay dismissed and duplicate alerts are not created.
- Admin recovery now covers incoming stylist messages, orders, service requests, service notes, and guest messages.
- Stylist recovery covers incoming front-desk messages.
- Strengthened the `createMessageNotifications` backend function to read both direct and nested Base44 entity fields.
- Notification records remain private to the recipient and are persisted under the recipient account.

## Deployment

Deploy the complete project, including:

- `src/hooks/useAdminNotifications.jsx`
- `src/hooks/useStylistNotifications.jsx`
- `base44/functions/createMessageNotifications/entry.ts`

A frontend-only deployment enables the recipient-side recovery path. Deploying the backend function as well restores the primary server-side delivery path.
