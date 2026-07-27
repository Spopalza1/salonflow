# SalonFlow Base44 Update System

This updater brings new Base44 UI/UX exports into the working Electron project without overwriting desktop-specific work.

## It protects

- `electron.js` and `preload.cjs`
- Windows icons and the entire `build/` folder
- GitHub Actions workflows
- Electron Builder, publishing, updater, and desktop scripts in `package.json`
- `vite.config.js` (`base: './'` needed by packaged Electron)
- `src/App.jsx` (`HashRouter` needed by packaged Electron)
- `src/api/base44Client.js` (production Base44 routing)
- `src/lib/AuthContext.jsx` (production API URL)
- `.env.local`

## First use

From the SalonFlow project folder:

```bash
npm run base44:preview -- "/path/to/SalonFlow-NewUpdate.zip"
```

Review the list. Nothing is changed during preview.

Apply the update:

```bash
npm run base44:update -- "/path/to/SalonFlow-NewUpdate.zip" --bump patch
```

Then run:

```bash
npm install
npm run build
npm run desktop:dev
```

After testing:

```bash
git status
git add -A
git commit -m "Apply latest Base44 UI update"
git push origin desktop-app
```

## Backups

Every applied update creates a timestamped backup under:

```text
.salonflow-backups/
```

It also creates `base44-update-report.json` describing exactly what changed and which incoming files were intentionally protected.

## Future workflow

1. Export the latest code ZIP from Base44.
2. Put the ZIP anywhere on the Mac, such as Downloads.
3. Run preview.
4. Run apply with `--bump patch`.
5. Run `npm install`, build, and test.
6. Commit and push.

Never extract the new Base44 export over the Electron project manually.
