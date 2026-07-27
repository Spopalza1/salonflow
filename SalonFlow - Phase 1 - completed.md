# SalonFlow - Phase 1 - Completed

## Implemented
- Added a shared Base44 adapter and server-function invocation boundary.
- Added domain repositories for chat, notifications, orders, services, menu, staff, and guests.
- Migrated the primary ChatPanel loading, subscription, read-update, stylist-list, and notification calls to `chatRepository`.
- Established use-case-oriented repository methods instead of exposing raw entity names to future components.

## Changed
- New code can now depend on stable feature contracts rather than direct Base44 SDK calls.
- Base44 remains the active transport, preserving current functionality.
