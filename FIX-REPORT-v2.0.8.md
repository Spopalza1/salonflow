# SalonFlow v2.0.8 — Guest QR Menu Fix

## Root cause
The guest menu queried Base44 with both `salon_id` and `available: true`. Legacy menu records can have `available` unset while still appearing in the admin menu. Base44 therefore returned no records to unauthenticated QR visitors. Direct public entity reads can also behave differently from authenticated admin reads.

## Changes
- Added `getGuestMenu`, a salon-scoped backend function using Base44 service-role reads for unauthenticated guests.
- The function queries menu items by salon only and includes every item unless `available` is explicitly `false`.
- Categories, option groups, and salon settings are returned from the same salon-scoped request.
- Guest `MenuBrowser` now uses this backend function instead of direct public entity filters.
- Menu creation now always saves the normalized salon ID used by the admin menu and QR generator.
- Updated project version to 2.0.8.

## Deployment requirement
Upload/deploy the complete project to Base44 so the new `base44/functions/getGuestMenu/entry.ts` function is published. Rebuilding only the frontend without deploying the Base44 function will not apply this fix.
