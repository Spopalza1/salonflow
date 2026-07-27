#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const sourceArg = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
const preview = args.includes('--preview') || !apply;
const bumpIndex = args.indexOf('--bump');
const bumpType = bumpIndex >= 0 ? args[bumpIndex + 1] : null;

if (!sourceArg || args.includes('--help')) {
  console.log(`\nSalonFlow Base44 Update System\n\nUsage:\n  npm run base44:preview -- /path/to/Base44-export.zip\n  npm run base44:update -- /path/to/Base44-export.zip\n  npm run base44:update -- /path/to/Base44-export.zip --bump patch\n\nThe updater copies Base44 UI files while protecting Electron, packaging,\nproduction API routing, HashRouter, icons, workflows, and updater settings.\n`);
  process.exit(sourceArg ? 0 : 1);
}

const PROTECTED = [
  '.env.local',
  '.gitignore',
  '.github/**',
  'build/**',
  'electron.js',
  'preload.cjs',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'src/App.jsx',
  'src/api/base44Client.js',
  'src/lib/AuthContext.jsx'
];

const IGNORED = [
  '.git/**',
  '.DS_Store',
  'node_modules/**',
  'dist/**',
  'release/**',
  'dist-electron/**'
];

function normalize(p) { return p.split(path.sep).join('/').replace(/^\.\//, ''); }
function matches(pattern, rel) {
  if (pattern.endsWith('/**')) return rel === pattern.slice(0, -3) || rel.startsWith(pattern.slice(0, -2));
  return rel === pattern;
}
function isProtected(rel) { return PROTECTED.some((p) => matches(p, rel)); }
function isIgnored(rel) { return IGNORED.some((p) => matches(p, rel)); }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function same(a, b) { return fs.existsSync(a) && fs.existsSync(b) && sha(a) === sha(b); }
function ensureDir(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = normalize(path.relative(base, full));
    if (isIgnored(rel)) continue;
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(rel);
  }
  return out;
}
function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
}
function locateRoot(extracted) {
  const items = fs.readdirSync(extracted, { withFileTypes: true }).filter((x) => x.name !== '__MACOSX');
  if (items.length === 1 && items[0].isDirectory()) return path.join(extracted, items[0].name);
  return extracted;
}
function extractSource(input) {
  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) throw new Error(`Update source not found: ${resolved}`);
  if (fs.statSync(resolved).isDirectory()) return { root: resolved, cleanup: null };
  if (!resolved.toLowerCase().endsWith('.zip')) throw new Error('Update source must be a Base44 ZIP or folder.');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'salonflow-base44-'));
  if (process.platform === 'win32') {
    run('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${resolved.replaceAll("'", "''")}' -DestinationPath '${temp.replaceAll("'", "''")}' -Force`]);
  } else {
    run('unzip', ['-q', resolved, '-d', temp]);
  }
  return { root: locateRoot(temp), cleanup: temp };
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, obj) { fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`); }
function bumpVersion(version, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version || '0.0.0');
  if (!match) throw new Error(`Cannot bump invalid version: ${version}`);
  let [, major, minor, patch] = match;
  major = Number(major); minor = Number(minor); patch = Number(patch);
  if (type === 'major') { major++; minor = 0; patch = 0; }
  else if (type === 'minor') { minor++; patch = 0; }
  else if (type === 'patch') patch++;
  else throw new Error('--bump must be major, minor, or patch');
  return `${major}.${minor}.${patch}`;
}

let extracted;
try {
  extracted = extractSource(sourceArg);
  const incomingRoot = extracted.root;
  if (!fs.existsSync(path.join(incomingRoot, 'src'))) throw new Error('The ZIP does not look like a Base44 project: src/ is missing.');

  const incomingFiles = walk(incomingRoot);
  const copyFiles = [];
  const protectedDifferences = [];
  const unchanged = [];

  for (const rel of incomingFiles) {
    const from = path.join(incomingRoot, rel);
    const to = path.join(PROJECT_ROOT, rel);
    if (isProtected(rel)) {
      if (!same(from, to)) protectedDifferences.push(rel);
      continue;
    }
    if (same(from, to)) unchanged.push(rel);
    else copyFiles.push(rel);
  }

  const currentPackagePath = path.join(PROJECT_ROOT, 'package.json');
  const incomingPackagePath = path.join(incomingRoot, 'package.json');
  const currentPackage = readJson(currentPackagePath);
  const incomingPackage = fs.existsSync(incomingPackagePath) ? readJson(incomingPackagePath) : {};
  const addedDeps = [];
  const updatedDeps = [];
  const addedDevDeps = [];
  const updatedDevDeps = [];
  const mergedPackage = structuredClone(currentPackage);

  for (const [section, added, updated] of [
    ['dependencies', addedDeps, updatedDeps],
    ['devDependencies', addedDevDeps, updatedDevDeps]
  ]) {
    mergedPackage[section] ||= {};
    for (const [name, version] of Object.entries(incomingPackage[section] || {})) {
      if (!(name in mergedPackage[section])) added.push(`${name}: ${version}`);
      else if (mergedPackage[section][name] !== version) updated.push(`${name}: ${mergedPackage[section][name]} → ${version}`);
      mergedPackage[section][name] = version;
    }
  }

  mergedPackage.scripts ||= {};
  mergedPackage.scripts['base44:preview'] = 'node tools/base44-update.mjs --preview';
  mergedPackage.scripts['base44:update'] = 'node tools/base44-update.mjs --apply';
  if (bumpType) mergedPackage.version = bumpVersion(mergedPackage.version, bumpType);
  const packageChanges = JSON.stringify(currentPackage) !== JSON.stringify(mergedPackage);

  console.log('\n=== SalonFlow Base44 Update Preview ===');
  console.log(`Mode: ${preview ? 'PREVIEW (no files changed)' : 'APPLY'}`);
  console.log(`Project: ${PROJECT_ROOT}`);
  console.log(`Incoming: ${incomingRoot}`);
  console.log(`\nUI/source files to update: ${copyFiles.length}`);
  copyFiles.forEach((f) => console.log(`  UPDATE  ${f}`));
  console.log(`\nProtected desktop files with incoming differences: ${protectedDifferences.length}`);
  protectedDifferences.forEach((f) => console.log(`  KEEP    ${f}`));
  if (addedDeps.length || updatedDeps.length || addedDevDeps.length || updatedDevDeps.length) {
    console.log('\nDependency merge:');
    addedDeps.forEach((x) => console.log(`  ADD dependency     ${x}`));
    updatedDeps.forEach((x) => console.log(`  UPDATE dependency  ${x}`));
    addedDevDeps.forEach((x) => console.log(`  ADD devDependency  ${x}`));
    updatedDevDeps.forEach((x) => console.log(`  UPDATE devDependency ${x}`));
  }
  if (bumpType) console.log(`\nVersion: ${currentPackage.version} → ${mergedPackage.version}`);

  if (!apply) {
    console.log('\nPreview complete. Run the base44:update command to apply these changes.');
    process.exit(0);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = path.join(PROJECT_ROOT, '.salonflow-backups', stamp);
  fs.mkdirSync(backupRoot, { recursive: true });

  for (const rel of copyFiles) {
    const current = path.join(PROJECT_ROOT, rel);
    if (fs.existsSync(current)) {
      const backup = path.join(backupRoot, rel);
      ensureDir(backup);
      fs.copyFileSync(current, backup);
    }
  }
  fs.copyFileSync(currentPackagePath, path.join(backupRoot, 'package.json'));

  for (const rel of copyFiles) {
    const from = path.join(incomingRoot, rel);
    const to = path.join(PROJECT_ROOT, rel);
    ensureDir(to);
    fs.copyFileSync(from, to);
  }
  if (packageChanges) writeJson(currentPackagePath, mergedPackage);

  const report = {
    appliedAt: new Date().toISOString(),
    source: path.resolve(sourceArg),
    backup: backupRoot,
    updatedFiles: copyFiles,
    protectedDifferences,
    addedDeps,
    updatedDeps,
    addedDevDeps,
    updatedDevDeps,
    version: mergedPackage.version
  };
  fs.writeFileSync(path.join(PROJECT_ROOT, 'base44-update-report.json'), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`\nUpdate applied successfully.`);
  console.log(`Backup: ${backupRoot}`);
  console.log('\nNext commands:');
  console.log('  npm install');
  console.log('  npm run build');
  console.log('  npm run desktop:dev');
  console.log('  git diff');
} catch (error) {
  console.error(`\nUpdate failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (extracted?.cleanup) fs.rmSync(extracted.cleanup, { recursive: true, force: true });
}
