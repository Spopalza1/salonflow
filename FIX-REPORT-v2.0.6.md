# SalonFlow v2.0.6 Targeted Fixes

## 1. Guest QR salon routing
- Guest links now recover the salon ID from current HashRouter links, legacy query-before-hash links, alternate parameter names, and older path-based links.
- Legacy links are canonicalized to `salon_id` so guest navigation keeps the correct salon context.
- The menu loader now reloads whenever `salonId` changes instead of only on the first component mount.
- Menu, category, option-group, and salon-setting queries remain isolated to the scanned salon.

## 2. Desktop chat scrolling
- Admin and stylist chat panels now have a viewport-constrained desktop height.
- The message history scrolls inside the chat surface while the page/header/input remain fixed.
- Stylist view now disables outer-page scrolling while the Chat tab is active, matching the admin behaviour.

## 3. Notification stack behaviour
- Clicking a notification stack now replaces the stacked card with individual notifications.
- The visual stack no longer remains above the expanded notification list.
- Added `Clear stack` for an expanded group.
- Added a hover/focus clear button directly on a collapsed stack.
- Individual notification dismissal remains available.
