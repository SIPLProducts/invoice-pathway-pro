

## Plan: Fully automatic SAP cookies on every API call (no manual paste, no Login button)

### What you want
- No "Login to SAP" button click.
- No JSESSIONID / __VCAP_ID__ paste box in the UI.
- Every SAP API call (Get DMR List, Submit DMR, etc.) just works — the middleware silently obtains and attaches the cookies on its own, and refreshes them when they expire.

### How it will work

```text
Frontend calls any SAP API (e.g. GET /api/gate/headers)
        │
        ▼
Middleware checks in-memory cookie cache
        │
   ┌────┴────┐
   │ hit?    │
   └────┬────┘
   yes  │  no / expired
        │     │
        │     ▼
        │  Auto-login to SAP using SAP_USER / SAP_PASSWORD
        │  from middleware/.env  →  reads Set-Cookie
        │  →  caches { JSESSIONID, __VCAP_ID__, savedAt, expiresAt=+4h }
        │     │
        ▼     ▼
   Attach cached cookies to outgoing SAP request
        │
        ▼
   If SAP responds "session expired" → auto re-login once → retry
```

The user never sees a login screen, never pastes a cookie, never clicks a button. Cookies live entirely inside the middleware process.

### Backend (middleware) changes

**1. New `middleware/src/sapSessionStore.js`**
- In-memory cache `{ jsessionid, vcapId, savedAt, expiresAt, sapUser }`.
- `ensureSession()` — returns cached cookie string; if missing/expired, calls `loginToSap()` first.
- `loginToSap()` — `GET {SAP_BASE_URL}{SAP_SERVICE_PATH}/GateHeader?$top=0&sap-client=...` with HTTP Basic auth from `.env`, parses `set-cookie`, stores `JSESSIONID` + `__VCAP_ID__`, sets `expiresAt = savedAt + 4h`.
- `getStatus()` — previews + timestamps (used only for logs).
- `clearSession()`.

**2. `middleware/src/sapClient.js` — auto-attach + auto-refresh on every call**
- In `buildRequestConfig`: if caller didn't pass cookies, call `await sapSessionStore.ensureSession()` and inject the result as the `Cookie` header.
- On `sap_session_expired` from `ensureJson`, call `sapSessionStore.loginToSap()` once and retry the original request transparently.
- Caller-supplied `x-sap-jsessionid` / `x-sap-vcap-id` continue to win (kept only as an emergency override; no UI surfaces it anymore).

**3. Per-API console logging**
- New `middleware/src/util/sessionLog.js` exporting `logSapCall({ method, path, phase })`.
- Hooked at the start of `sapGet`, `sapWrite`, `sapBatch`, plus on login success/failure and on the auto-retry path.
- Output examples (one line per call):

```
[SAP] LOGIN ok user=GANGADHARV  savedAt=2026-04-23T06:31:00Z  expiresAt=2026-04-23T10:31:00Z  ttl=4h
[SAP] GET  /GateHeader?$top=20  session=ACTIVE   savedAt=2026-04-23T06:31:00Z  expiresAt=2026-04-23T10:31:00Z  remaining=3h 59m  jsess=s%3A5pRr…  vcap=d275984a…
[SAP] POST /GateHeader          session=ACTIVE   savedAt=…                     expiresAt=…                    remaining=3h 12m  jsess=…           vcap=…
[SAP] GET  /GateHeader?$top=20  session=EXPIRED  savedAt=…  expiresAt=…  remaining=expired  → auto re-login
[SAP] LOGIN ok user=GANGADHARV  savedAt=…  expiresAt=…  ttl=4h
[SAP] GET  /GateHeader?$top=20  retry=ok
```

- Toggle via `SAP_SESSION_LOG=1` (default on); set `0` to silence.
- Cookies are masked to first 8 chars + `…` so logs are safe to share.

### Frontend changes

**1. `src/pages/SAPSettings.tsx`** — remove the entire "SAP Browser Session" card (JSESSIONID/__VCAP_ID__ inputs, Save/Clear buttons, "How to get cookies" guide). Replace with a small read-only status panel that polls `GET /api/health/sap` and shows:
- `SAP connection: OK` / `Failing`
- `Last checked: hh:mm:ss`
- A single **"Test connection"** button (optional).

No login UI, no paste UI.

**2. `src/lib/sapSession.ts`** — strip out `setSapSession`, `clearSapSession`, and the `x-sap-jsessionid` / `x-sap-vcap-id` headers from `getSapSessionHeaders()`. The function becomes a no-op returning `{}` (kept so existing callers in `useSapProxy` / `useSapCreate` don't break).

**3. `src/App.tsx`** — no auto-login hook needed; cookies are obtained lazily on the first SAP call.

### Files to add / change
- **new** `middleware/src/sapSessionStore.js`
- **new** `middleware/src/util/sessionLog.js`
- `middleware/src/sapClient.js` — auto-attach cached cookies, auto re-login on expiry, per-call logging
- `src/pages/SAPSettings.tsx` — remove session paste card; add small read-only status
- `src/lib/sapSession.ts` — neutralize manual cookie headers

### What stays the same
- `ZUI_Gate_Service`, `Get DMR List`, Submit-to-SAP flow, `useSapProxy`, `useSapCreate` — untouched.
- `STORAGE_KEY` not bumped; your custom APIs and middleware URL stay intact.
- No DB changes.

### Required `.env` on the middleware machine
```
SAP_BASE_URL=...
SAP_SERVICE_PATH=...
SAP_CLIENT=100
SAP_USER=GANGADHARV
SAP_PASSWORD=********
SAP_AUTH_MODE=basic
SAP_SESSION_LOG=1
```
If these creds are missing, the middleware will return a clear error on the first SAP call (instead of silently failing).

### Caveats
- If your SAP tenant blocks Basic auth (forces SSO/OAuth), the auto-login will fail with `sap_auth_redirect`. Long-term fix: switch to OAuth client_credentials (already supported via `SAP_AUTH_MODE=oauth_cc` with `SAP_OAUTH_*` envs). Same auto-attach logic applies; only the token-fetch step changes.
- Cookies live in middleware memory only — restarting the middleware drops them and triggers one auto-login on the next call (logged).

### Expected result
- API Settings page no longer shows any cookie/login UI — just a small status indicator.
- Every SAP API call works without manual intervention; cookies are fetched, attached, and refreshed by the middleware.
- Middleware terminal prints one line per SAP call with `savedAt → expiresAt → remaining`, plus explicit `LOGIN ok` and `→ auto re-login` events.

