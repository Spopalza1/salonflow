# SalonFlow targeted fixes

This update addresses the reported notification, category rearrangement, and guest customization issues.

## Notification reliability
- The admin notification hook is now mounted from the shared authenticated layout.
- Admins receive chat, order, service, service-note, and guest-message alerts from realtime events.
- Existing unread incoming messages and pending orders are reconciled when the admin workspace loads.
- Stylists receive recipient-specific chat notifications for incoming front-desk messages.
- Notification creation uses persisted Notification records when available and an in-memory fallback when the updated remote Notification schema/functions have not yet been deployed.
- The toast system now observes the centralized notification state, so in-app toasts are not dependent on a second realtime subscription.
- Native macOS notifications are treated as optional; native permission failures do not prevent in-app notifications or toasts.

## Category rearrangement
- Removed native HTML drag-and-drop from category capsules, eliminating the macOS drag preview square and green plus cursor.
- Added pointer-based, capture-based rearrangement with spring layout movement.
- The capsule itself remains the visual drag target.
- Removed visible arrow buttons from arrange mode.
- Keyboard users can focus a capsule and use arrow keys to reorder.

## Guest menu
- Required and Optional badges are hidden in the guest customization experience.
- Required validation remains active internally, so guests must still complete required choices.
- Admin configuration and admin-facing requirement controls are unchanged.

## Deployment note
For persistent recipient-specific notifications across sessions, publish the included Base44 Notification entity definition and notification functions. The local fallback keeps the in-app notification centre and toast system working during desktop development even before that deployment.
