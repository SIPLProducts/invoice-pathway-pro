## Why your settings "disappear" after publishing

Your SAP API configurations (middleware URL, credentials, endpoints, fields, scheduler, etc.) are **not actually missing** on the published site — they're just stored in the **wrong place**.

Looking at `src/lib/sapApisStore.ts`:

```
const STORAGE_KEY = "dmr.sapApis.v3";
localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
```

Everything you configure on the **SAP Settings → API Configurations** screen is saved to **`localStorage` in your browser**. That means:

- Configs saved in the **Lovable preview** (`id-preview--…lovable.app`) live only in that origin's localStorage.
- The **published site** (`invoice-pathway-pro.lovable.app` / `dmr2grn.siplproducts.com`) is a *different origin* with an empty localStorage → it shows only the seed defaults.
- Other devices / browsers / incognito windows also see empty configs.
- Clearing browser data wipes everything.

Publishing pushes only **code**, never browser storage — so the configs were never "lost", they simply never existed on that origin.

## Proposed fix: persist SAP API configs in Lovable Cloud

Move the store from `localStorage` to a Cloud (Supabase) table so configs are shared across all devices, browsers, and the preview ↔ published builds.

### 1. Database (new migration)
Create one table:

- `sap_api_configs`
  - `id uuid pk default gen_random_uuid()`
  - `name text unique not null`              ← matches today's `SapApi.name` key
  - `config jsonb not null`                  ← the full `SapApi` object (endpoint, auth, fields, scheduler, credentials, middleware, advanced…)
  - `updated_by uuid references auth.users` (nullable for now since auth is demo-only)
  - `created_at`, `updated_at` timestamps + trigger

**RLS**: enable RLS. For now (demo-only auth, no real Supabase users yet) use permissive policies so the app keeps working:
- `select`: allow anon + authenticated
- `insert / update / delete`: allow anon + authenticated

We'll tighten this to admin-only once real auth is wired up (see "Future hardening" below).

### 2. Refactor `src/lib/sapApisStore.ts`
- Replace the `localStorage` read/write layer with Supabase calls (`supabase.from('sap_api_configs').select/insert/update/delete`).
- Keep the existing `useSyncExternalStore` API (`useSapApis`, `getSapApi`, `addApi`, `updateApi`, `deleteApi`, `exportApis`, `importApis`, `resetApis`) so **no callers need to change**.
- On first load, fetch all rows once and cache in memory; subscribe to Supabase realtime on `sap_api_configs` so changes from one device propagate to others.
- Keep a **read-only `localStorage` fallback** purely for offline/PWA use — writes always go to Cloud.

### 3. One-time migration of existing localStorage configs
On first load after the update, if Cloud has zero rows AND localStorage has entries under `dmr.sapApis.v3`, automatically upload them to Cloud (and keep a local backup). This means **the configs you've already set up in preview will be uploaded the first time you open the app after this change**, so you won't have to re-enter them.

After successful upload, show a one-time toast: *"Migrated N SAP API configurations to Cloud."*

### 4. Seed behavior
Today `mergeSeedNonDestructive()` injects defaults from `src/lib/seed.ts`. Keep this, but run it as a Cloud upsert (only inserts missing names, never overwrites existing rows).

### 5. No UI changes required
`SAPSettings.tsx`, `SAPApiEdit.tsx`, `AddApiDialog.tsx`, `useSapProxy`, `useSapCreate`, `useSapUpdate`, `useSapItemUpdate`, `SapLiveTable`, `DMRList`, `DMRNew` all consume the same hook surface — they keep working unchanged.

### 6. Future hardening (not in this change, just noting)
Once you switch from demo-only auth to real Lovable Cloud auth + a roles table, we'll tighten RLS so only `admin` can `insert/update/delete` SAP API configs, while everyone authenticated can `select`.

## What you'll see after this ships
1. Configure an API in preview → it's saved in Cloud.
2. Click **Publish → Update**.
3. Open the published URL on any device → the same configurations (middleware URL, credentials, fields, scheduler) are already there.
4. Edits made on production sync back to preview and vice versa in real time.

## Out of scope (intentionally)
- Storing the SAP **password** more securely than `jsonb`. Today it's already in plaintext localStorage; moving to Cloud `jsonb` is at least no worse and gated by RLS. Proper secret handling belongs in the middleware's env vars (which is already where the *real* SAP credentials live — the ones in the UI are only used for display/manual override).
- Changing the middleware itself.
- Changing demo auth.
