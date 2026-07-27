# SalonFlow original-backend and QR-routing fix

## Root causes corrected

1. The frontend and `base44/.app.jsonc` were connected to the new empty Base44 app `6a65b243362fbad583d19c16`. They now default to the original app `6a5ed621ac293f2abc6083e5`, which is the backend expected to contain the existing users and records.
2. `AuthProvider` was mounted outside `HashRouter`, while auth/navigation logic depends on router context. It is now mounted inside the router.
3. Public guest routes waited for private authentication resolution and could be redirected by auth errors. `/guest` and `/guest-menu` are now explicitly public.
4. Navigation was invoked during rendering through `navigateToLogin()`. It now uses declarative `<Navigate>` routing.
5. The toast renderer was outside the notification/router tree. It is now inside both providers.
6. QR links use the HashRouter-compatible `/#/guest?salon_id=...` format.
7. Published URLs now prefer the current hosted origin, so custom domains work automatically. Local Electron builds can use `VITE_PUBLIC_APP_URL`.

## Local setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then run:

```bash
npm install
npm run desktop:dev
```

If the browser/Electron session previously used the new app, clear its cached session once:

```js
localStorage.removeItem('base44_app_id');
localStorage.removeItem('base44_app_base_url');
localStorage.removeItem('base44_access_token');
localStorage.removeItem('token');
location.reload();
```

## Important deployment warning

The local project now targets the original backend. Do not run a full `base44 deploy` against production until entity and function definitions are compared with the live app. For a frontend-only update, build and deploy only the site when the original project is linkable:

```bash
npm run build
npx base44@latest site deploy
```
