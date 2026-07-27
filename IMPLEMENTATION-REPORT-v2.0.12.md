# SalonFlow v2.0.12 — Notifications & Guest QR Implementation Report

## Scope
Targeted changes only. Existing visual design, authentication, dashboards, menu builder, stylist portal, and unrelated business logic were preserved.

## 1. In-app notification pipeline

### Problems found
- The project had a backend producer pipeline plus client reconciliation hooks, but the admin recovery hook only looked for an existing notification. When a backend trigger or realtime event was missed, reconciliation could not restore the missing durable record.
- Single-item read/open/dismiss actions updated the entity directly from the UI instead of consistently using the ownership-checking `updateNotificationState` server function.
- This split behavior made delivery recovery and state transitions less predictable.

### Implemented
- Kept server functions as primary notification producers.
- Added an idempotent admin recovery fallback: it checks `idempotency_key`, creates only a missing recipient record, then merges the persisted record into the inbox.
- Routed read/open/dismiss transitions through `notificationService` → `updateNotificationState`, which validates recipient and salon ownership.
- Retained realtime subscription, focus reconciliation, polling recovery, toast display, grouping, and navigation behavior.

### Resulting flow
Business event → server producer → durable Notification → realtime inbox update → toast/badge → secure read/open/dismiss transition.

If producer/realtime delivery fails: reconciliation → idempotency lookup → one durable recovery record.

## 2. Guest QR menu routing

### Problems found
- Generated links placed the salon identifier inside the hash fragment (`#/guest?salon_id=...`). That can be fragile when mobile QR scanners, redirects, custom domains, or wrappers normalize URL fragments.
- Guest salon-name loading attempted a direct entity read on a public unauthenticated page.
- Link testing and copying were not available from the QR panel.

### Implemented
- Added one canonical `buildGuestMenuUrl()` helper.
- New format: `https://host/?salon_id=<SALON_ID>#/guest`.
- Kept compatibility with old QR formats already supported by the guest parser.
- Public salon settings now load through the scoped `getGuestMenu` server function.
- Added **Copy Link**, **Test Link**, and **Open QR** controls.
- Hosted custom domains still use the current origin automatically; Electron/local builds use configured public URL fallback behavior.

## Validation performed
- Source-level verification of canonical QR URL generation and legacy parsing compatibility.
- Source-level verification of notification idempotency, recipient scoping, and secure state-transition wiring.
- JavaScript syntax check for the non-JSX URL helper.

## Validation limitation
The container package-install command failed before dependencies could be installed, so Vite build, ESLint, and project typecheck could not be executed in this environment. Run `npm install`, `npm run build`, `npm run lint`, and `npm run typecheck` after extracting the ZIP.

## Deployment notes
Base44 server functions must be deployed with the frontend for the secure notification state transitions and public guest menu function to match this build. Existing printed QR codes remain supported.
