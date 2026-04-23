

## Plan: Dynamic SAP Browser Session + per-API session lifetime logging

### Part 1 — Dynamic auto-login (same as the previously approved plan)

**Backend (middleware):**
- **New** `middleware/src/sapSessionStore.js` — in-memory cache `{ jsessionid, vcapId, savedAt, expiresAt, sapUser }`.
  - `loginToSap({ user, password })`: `GET /GateHeader?$top=0&sap-client=...` with Basic auth, parses `set-cookie`, stores `JSESSIONID` + `__VCAP_ID__`, sets `expiresAt = now + 4h`.
  - `getCachedCookies()` → cookie string or `null` if missing/expired.
  - `clearSession()`.
- **New** `middleware/src/routes/sapSession.js`:
  - `POST /api/sap-session/login` — uses `.env` credentials by default; body can override.
  - `GET /api/sap-session/status` — returns previews + timestamps.
  - `POST /api/sap-session/logout` — clears cache.
- **Update** `middleware/src/server.js` — mount the new route.
- **Update** `middleware/src/sapClient.js`:
  - `buildRequestConfig` falls back to `sapSessionStore.getCachedCookies()` when caller didn't pass cookies.
  - On `sap_session_expired` from `ensureJson`, auto-call `loginToSap` once and retry; if it still fails, surface the original error.
  - Caller-supplied `x-sap-jsessionid` / `x-sap-vcap-id` always wins (manual paste fallback preserved).

**Frontend:**
- **Update** `src/lib/sapSession.ts` — add `loginToSapDynamic({ user?, password? })`, `refreshSapSessionStatus()`. Keep `setSapSession` for manual paste.
- **Update** `src/pages/SAPSettings.tsx` — replace JSESSIONID/__VCAP_ID__ paste block with:
  - Primary **"Login to SAP"** button (uses middleware `.env` creds).
  - Optional **"Use different credentials"** disclosure (sent only on the request, never persisted in browser).
  - Display: `JSESSIONID` preview, `__VCAP_ID__` preview, **Saved at**, **Expires at**, **Time remaining**.
  - Buttons: **Re-login**, **Clear session**.
  - Old manual paste UI moved into a collapsed **"Advanced — paste cookies manually"** accordion.
- **Update** `src/App.tsx` — silent auto-login on app start if no cached session and middleware reports `.env` creds present.

### Part 2 — Per-API session lifetime logging in middleware (the new ask)

Add a tiny logging helper in `middleware/src/sapClient.js` that runs on **every** outgoing SAP call (`sapGet`, `sapWrite`, `sapBatch`) and emits a single, easy-to-grep line like:

```
[SAP] GET  /GateHeader?$top=20      session=ACTIVE   savedAt=2026-04-23T06:11:39.000Z   expiresAt=2026-04-23T10:11:39.000Z   remaining=3h59m   jsess=s%3A5pRr…   vcap=d275984a…
[SAP] POST /GateHeader               session=ACTIVE   savedAt=…   expiresAt=…             remaining=3h12m   jsess=…   vcap=…
[SAP] GET  /GateHeader?$top=0        session=NONE                                       (login attempt)
[SAP] LOGIN ok user=GANGADHARV       savedAt=2026-04-23T06:11:39.000Z   expiresAt=2026-04-23T10:11:39.000Z   ttl=4h
[SAP] GET  /GateHeader?$top=20      session=EXPIRED  savedAt=…   expiresAt=…             remaining=-12m   → auto re-login
[SAP] LOGIN ok user=GANGADHARV       savedAt=…   expiresAt=…   ttl=4h
[SAP] GET  /GateHeader?$top=20      retry=ok
```

**Implementation details:**
- **New** `middleware/src/util/sessionLog.js` exporting `logSapCall({ method, path, source })`:
  - Reads `sapSessionStore.getStatus()` → `{ jsessionid, vcapId, savedAt, expiresAt }`.
  - Computes `remaining = expiresAt - now` formatted as `XhYm` / `Ym` / `Xs`.
  - Marks session as `NONE` (no cache), `EXPIRED` (expiresAt < now), or `ACTIVE`.
  - Masks cookies to first 8 chars + `…` so logs are safe to share.
- Call `logSapCall(...)` at the **start** of `sapGet`, `sapWrite`, `sapBatch` in `middleware/src/sapClient.js`.
- Also log on `sapSessionStore.loginToSap` success/failure with `LOGIN ok` / `LOGIN fail reason=...` and the new `expiresAt` + `ttl=4h`.
- On the auto-retry path (after `sap_session_expired` triggers re-login), log `→ auto re-login` and then `retry=ok|fail`.
- Respect existing `morgan` logger — these lines go via `console.log` so they appear alongside `morgan` output without changing its format.
- Add an env toggle `SAP_SESSION_LOG=1` (default on); set `0` to silence if needed.

### Part 3 — UI surfacing of session lifetime

In `src/pages/SAPSettings.tsx`, the **"SAP Browser Session"** card will show a small live readout:
```
Session: ACTIVE
Saved at:    2026-04-23 11:41:39
Expires at:  2026-04-23 15:41:39
Remaining:   3h 47m
```
Polled from `GET /api/sap-session/status` every 30s while the page is open.

### Files to change / add
- **new** `middleware/src/sapSessionStore.js`
- **new** `middleware/src/routes/sapSession.js`
- **new** `middleware/src/util/sessionLog.js`
- `middleware/src/server.js` — mount route
- `middleware/src/sapClient.js` — cookie fallback, auto re-login, per-call logging
- `src/lib/sapSession.ts` — dynamic login + status helpers
- `src/pages/SAPSettings.tsx` — Login to SAP UI + live session readout + collapsed manual-paste fallback
- `src/App.tsx` — silent auto-login on app start

### What stays the same
- Manual cookie paste still works as a fallback (under "Advanced").
- `ZUI_Gate_Service`, `Get DMR List`, Submit-to-SAP, `useSapProxy`, `useSapCreate` — untouched.
- No DB changes.

### Caveats
- Some SAP BTP tenants disallow Basic auth from non-browser clients (forces OAuth/SSO). If that happens, login returns `sap_auth_redirect` and the UI falls back to the manual paste card; long-term fix is OAuth `client_credentials` (already supported in `sapClient.js` via `SAP_AUTH_MODE=oauth_cc`).
- Session cache is in-memory; restarting the middleware drops it and triggers one auto re-login on the next call.

### Expected result
- One click on **Login to SAP** (or zero clicks if `.env` creds are present and auto-login runs at startup) → session active and self-refreshing.
- Middleware logs every SAP call with current session state, save time, expiry, and remaining lifetime — easy to verify when re-login fires.
- SAP Settings page shows the same info live.

