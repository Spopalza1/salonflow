# SalonFlow - Phase 3 - Completed

## Implemented
- Added an authenticated backend command for notification read/open/dismiss transitions.
- Added a frontend notification application service.
- Converted the admin reconciliation hook to observer-only durable behavior.
- Removed client-side persistent notification creation from the fallback path.
- Documented backend authority for durable notification delivery.

## Changed
- Server notification functions are now the source of truth.
- The browser no longer acts as a competing durable event processor.
