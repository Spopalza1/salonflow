import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'base44/functions'];
const diagnostics = [];
let inspected = 0;

function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      inspected += 1;
      const source = fs.readFileSync(file, 'utf8');
      if (/^<{7}|^={7}|^>{7}/m.test(source)) diagnostics.push(`${file}: unresolved merge marker`);
      if (source.includes('\u0000')) diagnostics.push(`${file}: contains a NUL byte`);
    }
  }
}
for (const root of roots) walk(root);

const required = [
  'src/lib/NotificationContext.jsx',
  'src/hooks/useNotificationToasts.jsx',
  'src/components/CategoryDock.jsx',
  'src/components/prearrival/PreArrivalTimePicker.jsx',
  'src/components/prearrival/PreArrivalSettingsDialog.jsx',
  'base44/functions/createMessageNotifications/entry.ts',
  'base44/functions/createOrderNotifications/entry.ts',
  'base44/functions/createOperationalNotifications/entry.ts',
  'base44/functions/createPreArrivalOrder/entry.ts',
];
for (const file of required) if (!fs.existsSync(file)) diagnostics.push(`Missing required implementation file: ${file}`);

const notificationSchema = fs.readFileSync('base44/entities/Notification.jsonc', 'utf8');
if (!notificationSchema.includes('recipient_user_id')) diagnostics.push('Notification schema is missing recipient_user_id.');
if (!notificationSchema.includes('"data.recipient_user_id": "{{user.id}}"')) diagnostics.push('Notification RLS is not recipient-user scoped.');

if (diagnostics.length) {
  console.error(`Static checks failed (${diagnostics.length} issues):`);
  console.error(diagnostics.join('\n'));
  process.exit(1);
}
console.log(`Static checks passed. Inspected ${inspected} JavaScript/TypeScript files and verified critical implementation files.`);
