import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['local-server/server.mjs'], { env: { ...process.env, SALONFLOW_LOCAL_PORT: '4318', SALONFLOW_DATA_DIR: '/tmp/salonflow-smoke' }, stdio: 'ignore' });
try {
  await new Promise(r => setTimeout(r, 400));
  const health = await fetch('http://127.0.0.1:4318/health').then(r => r.json());
  if (!health.ok) throw new Error('Health check failed');
  console.log('Local server smoke check passed.');
} finally { child.kill(); }
