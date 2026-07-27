# SalonFlow v2.0.4 targeted repair report

## Issues found

### Logout loaded the old application
`AuthContext.logout()` explicitly redirected to `https://salonflow.live/`. In Electron and local testing this left the current build and loaded the older deployed website. The login form also used `window.location.href = "/"`, causing a hard reload rather than an in-app route transition.

### Notification Centre and chat unread state were disconnected
Chat unread badges were calculated from Message records, while the Notification Centre read Notification records. Notification creation was delayed until after a Notification database query/create attempt. When the updated Base44 Notification schema or functions were not deployed, the UI could show unread chat messages but no Notification Centre item.

### Notifications were suppressed across sessions
The admin and stylist notification hooks used module-level Sets. Those Sets survived component remounts in the same renderer process and could treat legitimate events as already handled after logout/login.

### Toast initialization could hide new reconciled activity
The toast hook marked every notification present on its first pass as already seen. Depending on render timing, newly reconciled notifications could enter state before the toast hook initialized and therefore never produce a toast.

### Recipient comparisons were fragile
Some notification ownership checks compared identifiers without normalization. The updated checks normalize IDs as strings before matching.

## Repairs implemented

- Added an in-app dashboard-style blurred backdrop behind the landing and login experience.
- Increased glass transparency, blur, borders, and depth on landing/login panels.
- Added password show/hide controls with accessible labels.
- Replaced hard login reloads with React Router navigation to the correct admin or stylist workspace.
- Replaced the external logout redirect with a reset of local auth state and navigation back to the current build's landing page.
- Rebuilt admin activity monitoring so local Notification Centre entries and toasts are created immediately, before persistence is attempted.
- Added recipient-specific notification persistence as a secondary step, with a working local fallback.
- Reset notification deduplication state for every authenticated user session.
- Reconciled unread chat messages and pending orders on dashboard load and window focus.
- Added realtime alerts for chat messages, new orders, order status changes, services, service status changes, service notes, and guest messages.
- Applied the same immediate notification behavior to stylist accounts.
- Updated toast handling so immediate local alerts always display, while old persisted alerts do not flood the screen after login.
- Preserved Notification Centre grouping and chronological sorting.

## Base44 deployment requirement

The local fallback now allows the Notification Centre and in-app toasts to work during testing even when the new Notification schema/functions are not deployed. To preserve notifications between devices and sessions, deploy these project resources to the connected Base44 app:

- `base44/entities/Notification.jsonc`
- `base44/functions/createMessageNotifications/entry.ts`
- `base44/functions/createOrderNotifications/entry.ts`
- `base44/functions/createOperationalNotifications/entry.ts`

Also configure `VITE_BASE44_APP_BASE_URL` in `.env.local` for the correct Base44 application during local testing. Do not commit secrets.

## Verification note

A dependency-based production build could not be executed in the packaging environment because npm dependencies could not be installed there. Source files were checked for balanced delimiters and the changes were kept isolated to authentication, landing/login presentation, and notification coordination. Run locally:

```bash
npm install
npm run test:static
npm run lint
npm run build
npm run desktop:dev
```
