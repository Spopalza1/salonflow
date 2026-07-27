# SalonFlow Regression Baseline

Critical workflows that must remain functional during every architecture phase:

1. Admin and stylist authentication.
2. Role-protected navigation and tenant isolation.
3. Guest menu loading and guest order submission.
4. Admin and stylist order creation/status updates.
5. Admin-to-stylist and stylist-to-admin messaging.
6. Message unread/read state and notification deep links.
7. Notification read, open, dismiss, and desktop-toast behavior.
8. Service creation, notes, and status updates.
9. Menu/category customization and realtime refresh.
10. Electron startup, preload bridge, and native notifications.

Every phase must run `npm run test:static`. When dependencies are available it must also run `npm run typecheck`, `npm run lint`, and `npm run build`.
