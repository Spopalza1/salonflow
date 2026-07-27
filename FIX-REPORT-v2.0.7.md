# SalonFlow v2.0.7 Fix Report

## Notification centre
- Removed the stack expand/collapse arrow. Clicking the notification stack now expands it into individual notifications.
- Kept a separate clear-stack action without covering an expand control.
- Added stylist-specific unified grouping by notification origin (front desk conversation, sender, service/order source).
- Removed login/focus reconciliation that recreated previously dismissed historical notifications.
- Persisted read/dismiss state continues to be loaded from the Notification entity.

## Stylist chat
- Stylist chat opens directly when a valid stylist account enters the chat tab.
- Added a fixed-height, internally scrollable message viewport and a non-shrinking composer.
- Chat positions itself at the newest message whenever a conversation opens or receives a message.
- Removed conversations persist per user in local storage and in the Base44 user record.
- Old messages no longer immediately restore a removed conversation; only a genuinely new subscribed message restores it.
- Added hidden_conversations to the User entity schema.

## Guest QR menu
- QR generation now resolves salon_id from both top-level and nested Base44 user data.
- Admin menu and QR generator now use the same normalized salon identifier.
- Guest menu loading performs a salon-filtered query first, then a public-read fallback with strict client-side salon isolation when Base44 returns an empty compound-filter result.
- Realtime menu updates compare normalized salon identifiers.

## Validation note
The project dependencies were not included in the uploaded ZIP. Production build/static checks require running `npm install` before `npm run build`.
