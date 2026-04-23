

## Plan: Make SAP Browser Session support both Auto (dynamic) and Manual modes

### Goal
Today the **SAP Browser Session** card on `/sap/settings` only shows "Auto-managed" — middleware handles cookies. The user wants a switch: choose **Auto** (current behavior) or **Manual** (paste your own JSESSIONID + __VCAP_ID__ cookies, e.g. captured from a logged-in SAP browser tab).

The middleware already supports this — `buildCookieFromHeaders` reads `x-sap-jsessionid` / `x-sap-vcap-id` request headers and forwards them to SAP, taking priority over the auto-login. The frontend already calls `getSapSessionHeaders()` in every proxy call. Only two small pieces are missing: a real session store on the client, and a UI to populate it.

### Changes

**1. `src/lib/sapSession.ts` — turn the no-op shim into a real localStorage-backed store**
- Add a `mode: "auto" | "manual"` field plus `jsessionid`, `vcapId`, `savedAt`.
- `getSapSessionHeaders()` returns `{ "x-sap-jsessionid": …, "x-sap-vcap-id": … }` only when `mode === "manual"` and both cookies are present. Otherwise returns `{}` (so middleware auto-login runs).
- `setSapSession({ jsessionid, vcapId })` stores manual cookies and switches mode to `manual`.
- `clearSapSession()` removes manual cookies and reverts to `auto`.
- Add `setSapSessionMode("auto" | "manual")` and persist to `localStorage` under `sap.session.v1`.
- Keep `useSapSession()` reactive via `useSyncExternalStore` so the UI updates instantly.

**2. `src/pages/SAPSettings.tsx` — add the mode switch on the SAP Browser Session card**
- Replace the static "Auto-managed" badge with a small segmented toggle (two buttons: **Auto** / **Manual**), reflecting `useSapSession().mode`.
- When **Auto** is selected: keep the existing description + "Test connection" button. Badge shows "Auto-managed" (success color).
- When **Manual** is selected: render two inputs (`JSESSIONID`, `__VCAP_ID__`) with **Save**, **Clear**, and **Test connection** buttons. Show a small status line: "Saved 2m ago" + masked previews. Badge shows "Manual cookies" (warning color) when both are present, "Manual — not set" (muted) otherwise.
- Add a one-line helper explaining how to grab the cookies (DevTools → Application → Cookies → copy `JSESSIONID` and `__VCAP_ID__` values from your SAP tab).
- The existing "Test connection" call already includes `getSapSessionHeaders()`, so it will automatically validate either mode.

**3. No middleware changes needed**
- `buildCookieFromHeaders` (in `middleware/src/sapClient.js`) already reads the headers and `resolveCookies` already prefers caller-supplied cookies over auto-login. Manual cookies will flow through end-to-end without touching middleware code.

### Behaviour matrix

| Mode    | Cookies set?     | What gets sent to middleware                | Middleware action                             |
|---------|------------------|---------------------------------------------|-----------------------------------------------|
| Auto    | n/a              | no `x-sap-*` headers                        | Auto-login + cookie cache (or stateless/oauth fallback) |
| Manual  | both present     | `x-sap-jsessionid`, `x-sap-vcap-id` headers | Forwards them to SAP as `Cookie:` header      |
| Manual  | missing/partial  | no `x-sap-*` headers                        | Falls back to auto-login (graceful)           |

### What stays the same
- Middleware code, `.env`, all auth modes, auto-fallback logic, troubleshooting card, error envelope — unchanged.
- Every existing caller (`useSapProxy`, `useSapCreate`, `testSapConnection`) already invokes `getSapSessionHeaders()`; no edits to those files.

### Files to change
- `src/lib/sapSession.ts` — implement the real store (~80 lines).
- `src/pages/SAPSettings.tsx` — add mode toggle + manual cookie inputs in the SAP Browser Session card (~60 added lines).

### Expected result
On `/sap/settings`, the SAP Browser Session card now has an **Auto / Manual** toggle. Picking **Manual** reveals two cookie input fields; saving them makes every subsequent SAP call (Test connection, DMR list, Submit, etc.) use those exact cookies. Switching back to **Auto** restores middleware-managed login. Both modes share the same Test connection button and the same error/troubleshooting cards already on the page.

