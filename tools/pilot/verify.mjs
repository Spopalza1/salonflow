import fs from 'node:fs';
const required = [
  'local-server/server.mjs',
  'local-server/store.mjs',
  'local-server/tools/backup.mjs',
  'local-server/tools/restore.mjs',
  'src/infrastructure/local/localBackend.js',
  'src/app/backend/backendMode.js',
  'docs/operations/PILOT-RUNBOOK.md',
];
const missing = required.filter(file => !fs.existsSync(file));
if (missing.length) { console.error('Pilot verification failed:', missing); process.exit(1); }
console.log('Pilot artifact verification passed.');
