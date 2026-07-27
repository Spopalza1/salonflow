import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dataDir = process.env.SALONFLOW_DATA_DIR || path.join(os.homedir(), '.salonflow');
const file = path.join(dataDir, 'salonflow.json');
const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const report = {
  generated_at: new Date().toISOString(),
  platform: process.platform,
  node: process.version,
  data_file_exists: fs.existsSync(file),
  data_file_bytes: fs.existsSync(file) ? fs.statSync(file).size : 0,
  counts: Object.fromEntries(Object.entries(state).map(([key, rows]) => [key, Array.isArray(rows) ? rows.length : 0])),
};
console.log(JSON.stringify(report, null, 2));
