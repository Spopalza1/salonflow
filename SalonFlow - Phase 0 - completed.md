# SalonFlow - Phase 0 - Completed

## Implemented
- Established a formal regression baseline for authentication, tenant isolation, chat, notifications, orders, services, guest flows, and Electron.
- Repaired `tools/static-check.mjs` so it no longer depends on an unavailable runtime TypeScript package entry.
- Added merge-marker and corrupt-file detection to static verification.
- Added a shared structured logger with credential redaction.
- Added ADR-0001 documenting the modular-monolith and ports/adapters migration strategy.

## Verification
- `npm run test:static` is the dependency-independent baseline check.
- Full build, lint, and typecheck remain part of the required clean-environment pipeline.
