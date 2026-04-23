

## Plan: Fix `sap_config_missing` — make middleware load `.env` regardless of CWD

### Root cause
The middleware crashes with `sap_config_missing` because `require("dotenv").config()` (line 3 of `middleware/src/server.js`) loads from the **current working directory**, not from the file's location.

The user is running:
```
PS D:\invoice-pathway-pro\middleware\src> node server.js
```
…from inside `middleware/src/`. So dotenv looks for `middleware/src/.env` (which doesn't exist) instead of `middleware/.env` (which does).

That's why the startup banner already showed:
```
[sapClient] Missing SAP_BASE_URL / SAP_SERVICE_PATH.
[sapClient] Basic auth selected but SAP_USER / SAP_PASSWORD missing.
```
…and every API call returns `{"code":"sap_config_missing"}`.

### Fix — one line in `middleware/src/server.js`
Change line 3 from:
```js
require("dotenv").config();
```
to:
```js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
```

This pins the `.env` path to `middleware/.env` relative to `server.js`, so the middleware loads the same env file no matter what directory it's launched from (`middleware/`, `middleware/src/`, or anywhere else).

### What stays the same
- `middleware/.env` contents — already correct (has `SAP_BASE_URL`, `SAP_USER`, `SAP_PASSWORD`, `SAP_AUTH_MODE=basic`).
- All auth-mode logic, auto-fallback, session store, frontend — untouched.
- No new dependencies (`path` is built-in).

### Expected result
After restarting the middleware (`node server.js` from any directory), the startup log will show:
```
[sapClient] mode=basic user=kishore.pabbathi@cbcmpl.com (auto-cookie session enabled)
SAP proxy listening on http://localhost:8080
```
- **Test Connection** button on `/sap/settings` will succeed (or return the real SAP error, not `sap_config_missing`).
- **Get DMR LIST** table will fetch rows.
- If the tenant still doesn't issue cookies, the previously-built auto-fallback to `basic_stateless` will kick in transparently.

### Files to change
- `middleware/src/server.js` — single-line change to dotenv config.

