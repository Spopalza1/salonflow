# SalonFlow Local Pilot Runbook

## Before pilot
1. Run `npm run test:static` and `npm run local:smoke`.
2. Start the server with `npm run local:server`.
3. Confirm `http://127.0.0.1:4317/health` returns `ok: true`.
4. Create a backup with `npm run local:backup`.
5. Set `VITE_BACKEND_MODE=local` only for the pilot build.

## Required scenarios
- Restart after an active chat.
- Simulated network interruption and reconnection.
- Two devices receiving the same realtime message.
- Read-state persistence after reload.
- PC sleep and resume.
- Backup, destructive test, and restore.
- Installer upgrade while preserving the data directory.

## Rollback
Set the backend mode to `base44`, restart the frontend, and retain the local data directory for later reconciliation. Do not delete the local database during rollback.
