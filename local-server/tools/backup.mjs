import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dataDir = process.env.SALONFLOW_DATA_DIR || path.join(os.homedir(), '.salonflow');
const source = path.join(dataDir, 'salonflow.json');
if (!fs.existsSync(source)) throw new Error(`No local database found at ${source}`);
const destination = process.argv[2] || path.join(dataDir, `backup-${new Date().toISOString().replaceAll(':','-')}.json`);
fs.copyFileSync(source, destination);
console.log(destination);
