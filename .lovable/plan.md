

## Plan: Fix `sap_no_cookies` error — support cookieless auth modes

### Root cause
SAP responded **200 OK** to the middleware's login call but did **not** issue `JSESSIONID` / `__VCAP_ID__` cookies. This happens on ABAP Environment (Steampunk) tenants where:
- The Communication Arrangement is configured for **OAuth 2.0**, not Basic auth, OR
- Basic auth is allowed but the tenant is **stateless** (sends `sap-stateful-session: false`), so no session cookies are ever issued — every request must carry `Authorization: Basic …` or a fresh Bearer token.

Either way, the current code path (`sap_no_cookies` thrown from `sapSessionStore.loginToSap`) blocks every API call.

### Fix — two complementary changes

**1. Add a new `SAP_AUTH_MODE=basic_stateless` mode in the middleware** *(zero-config workaround)*
- When set, the middleware sends `Authorization: Basic <user:pass>` on **every** SAP request (no login step, no cookie cache, no `sap_no_cookies` error).
- Implemented inside `middleware/src/sapClient.js`:
  - `useBasicStateless = authMode === "basic_stateless"`.
  - Skip `sapSessionStore.ensureSession()` entirely when in this mode.
  - In `buildRequestConfig`, attach `auth: { username: SAP_USER, password: SAP_PASSWORD }` and **do not** add a `Cookie` header.
  - The startup banner reflects the new mode.
- This is the fastest unblock for the screenshot's tenant if Basic creds are accepted but cookies are stripped.

**2. Update the OAuth path to actually be usable** *(recommended long-term)*
- Already supported via `SAP_AUTH_MODE=oauth_cc` + `SAP_OAUTH_TOKEN_URL` / `SAP_OAUTH_CLIENT_ID` / `SAP_OAUTH_CLIENT_SECRET`. No code change required — only documentation.
- Update `middleware/.env.example` to clearly describe the three working modes:
  - `basic` — stateful tenants that issue `JSESSIONID` cookies (today's default; not your tenant).
  - `basic_stateless` — stateless tenants that accept Basic auth on every call (new — your likely fix).
  - `oauth_cc` — proper Communication Arrangement with OAuth 2.0 (long-term recommended).

**3. Improve the frontend error message** *(better UX so the next person isn't stuck)*
- In `src/components/SapLiveTable.tsx`, when `error.code === "sap_no_cookies"`, render a clearer "How to fix" block listing the two options:
  - Option A (quick): set `SAP_AUTH_MODE=basic_stateless` in `middleware/.env` and restart middleware.
  - Option B (recommended): set `SAP_AUTH_MODE=oauth_cc` plus `SAP_OAUTH_*` envs.
- Also surface the same actionable hint in the toast that fires on **Submit to SAP** failure (the second screenshot), via `useSapCreate` already passing the `hint` field through — verify the toast in `DMRNew.tsx` reads `result.error` and append `result.sapBody?.error?.hint` when present.

### Files to change
- `middleware/src/sapClient.js` — add `basic_stateless` mode (skip session store, attach Basic auth per request).
- `middleware/.env.example` — document the three modes; add `SAP_AUTH_MODE=basic_stateless` example.
- `src/components/SapLiveTable.tsx` — extend the error panel to handle `sap_no_cookies` with the two-option fix-it guide.
- `src/pages/DMRNew.tsx` — append `hint` to the failure toast when the middleware returns one.

### What stays the same
- `sapSessionStore.js`, auto-login flow, per-call `[SAP]` logging — untouched and still used by `basic` mode.
- All API rows, schemas, `STORAGE_KEY`, middleware URLs — unchanged.
- No DB changes.

### Required `.env` change for the user (after these code changes ship)
Edit `middleware/.env`:
```
SAP_AUTH_MODE=basic_stateless
SAP_USER=GANGADHARV
SAP_PASSWORD=********
```
…then restart the middleware. The `Get DMR LIST` table and `Submit to SAP` should both work immediately.

If Basic isn't accepted at all, switch to:
```
SAP_AUTH_MODE=oauth_cc
SAP_OAUTH_TOKEN_URL=https://<tenant>.authentication.us10.hana.ondemand.com/oauth/token
SAP_OAUTH_CLIENT_ID=<from Communication Arrangement>
SAP_OAUTH_CLIENT_SECRET=<from Communication Arrangement>
```

### Expected result
- The `Failed to load from SAP — sap_no_cookies` red banner disappears once the middleware is restarted with `SAP_AUTH_MODE=basic_stateless` (or `oauth_cc`).
- `Get DMR LIST` populates rows; `Submit to SAP` succeeds.
- Middleware terminal still prints one `[SAP] …` line per call (without `savedAt/expiresAt` in stateless/oauth modes — replaced by `auth=basic_stateless` or `auth=oauth_cc token=…`).

