# SalonFlow Refinement Migration Guide

## 1. Back up

Create a repository tag and export current Base44 entity data before deployment.

## 2. Deploy schemas

Deploy these updated definitions:

- `base44/entities/Notification.jsonc`
- `base44/entities/SalonSetting.jsonc`
- `base44/entities/Message.jsonc`
- `base44/entities/Order.jsonc`

## 3. Notification migration

New private notifications require both `salon_id` and `recipient_user_id`.

For each legacy role-targeted notification:

1. Determine the intended users from the original salon and target role.
2. Create one new row per intended recipient.
3. Copy title, body, source, type, and read state.
4. Add a stable idempotency key such as `legacy:{legacy_id}:{recipient_id}`.
5. Archive or delete the old role-only row after validation.

Do not assign one stylist's private notification to every stylist in the salon.

## 4. Salon settings

Existing salons may continue with defaults. For each salon, review:

- timezone
- business hours
- pre-arrival enabled
- minimum preparation minutes
- maximum future minutes
- opening delay minutes
- cutoff before closing minutes
- guest category layout

## 5. Functions

Deploy all functions under `base44/functions`, especially:

- `createMessageNotifications`
- `createOrderNotifications`
- `createOperationalNotifications`
- `createPreArrivalOrder`
- `sendPreArrivalAlert`

## 6. Rollout

1. Deploy to a staging app.
2. Test with two salons, two admins, and at least two stylists per salon.
3. Verify recipient isolation.
4. Verify old clients can still read messages and orders.
5. Release the new web build.
6. Build a new Electron release and test the updater from the prior version.
