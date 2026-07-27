# SalonFlow Phase 1–7 Test Plan

## Local verification

```bash
npm ci
npm run test:static
npm run lint
npm run build
npm run desktop:dev
```

## Notification security

- Create a private alert for Stylist A.
- Confirm Stylist B in the same salon cannot query or open it.
- Confirm a user from a second salon cannot query it.
- Confirm changing a notification ID or URL parameter does not bypass entity permissions.

## Chat synchronization

- Send admin-to-stylist and stylist-to-admin messages.
- Confirm toast, Notification Centre, tab badge, and conversation badge update.
- Open the exact conversation and confirm only its alerts disappear.
- Hide an unread conversation and verify stale indicators clear.
- Send a newer message and verify the conversation returns.

## Notification navigation

Test exact navigation for chat, order, service, service note, guest message, and report notifications. Test a deleted target and confirm the user lands on the parent module with a graceful error.

## Voice messages

Test permission denial, short recording, cancel, lock, preview, upload, retry, play, pause, seek, 1x/1.5x/2x, one-at-a-time playback, navigation cleanup, and narrow-phone layout.

## Menu categories

Create, rename, mark complimentary, reorder by drag, reorder by arrow controls, reload, and verify order persists. Confirm item-category relationships and guest ordering remain correct.

## Pre-arrival

Test every minute around the earliest and latest boundaries. Test closed days, opening delay, closing cutoff, maximum future window, timezone boundary, invalid direct API timestamp, unavailable item, and tampered price.

## Responsive and accessibility

Test desktop, laptop, tablet, narrow phone, landscape, keyboard open, light, dark, reduced motion, keyboard-only navigation, and screen-reader labels.

## Release gate

Do not publish until build, lint, recipient isolation, chat synchronization, order submission, service updates, category persistence, and pre-arrival backend validation all pass in staging.
