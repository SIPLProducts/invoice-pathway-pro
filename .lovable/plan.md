

## Plan: Fix the current `sap_no_cookies` failure by auto-falling back to stateless auth

### What the actual issue is
Your middleware is still going through the **cookie-session login path**:

```text
resolveCookies -> ensureSession -> loginToSap -> sap_no_cookies
```

That means the running process is behaving as `SAP_AUTH_MODE=basic`, not as a stateless mode.

For your SAP tenant, login succeeds but SAP does **not** issue `JSESSIONID` / `__VCAP_ID__`. So the current middleware throws `sap_no_cookies` before the real API call is sent.

### What to build
Make the middleware **recover automatically** when SAP does not return cookies:

- If `SAP_AUTH_MODE=basic` tries cookie login and SAP returns `sap_no_cookies`,
- the middleware should **switch to per-request Basic auth automatically** for that process,
- then continue the API call without failing the user.

This removes the need for manual SAP login, manual cookie paste, and even manual env switching for this tenant.

## Implementation

### 1. Harden the middleware auth flow
Update `middleware/src/sapClient.js` so auth is resolved in this order:

```text
manual cookies from headers
→ cached SAP cookies (stateful mode)
→ if cookie login returns sap_no_cookies, auto-fallback to basic_stateless
→ if oauth_cc is configured, keep current OAuth flow
```

Changes:
- Add a runtime fallback flag like `effectiveBasicStateless`.
- In `resolveCookies()`:
  - if normal `basic` login throws `sap_no_cookies`, do **not** rethrow immediately.
  - mark the process as stateless for subsequent calls.
  - return `{ cookies: "", source: "basic-stateless-fallback" }`.
- In `buildRequestConfig()`:
  - if effective mode is stateless, attach:
    - `cfg.auth = { username: SAP_USER, password: SAP_PASSWORD }`
  - do not attach `Cookie`.
- In `withAutoSession()`:
  - only attempt cookie re-login when effective mode is truly cookie-based.
  - skip cookie retry logic for stateless mode.

Result: `GET /api/gate/headers` and save/POST requests will continue to SAP with Basic auth on every request instead of failing at cookie login.

### 2. Make the session store explicitly report “no cookies available”
Update `middleware/src/sapSessionStore.js`:
- keep the current cookie-login behavior for real stateful tenants.
- when SAP returns no cookies, preserve `err.code = "sap_no_cookies"`, but improve the hint to say:
  - tenant is likely stateless or OAuth-based
  - middleware can fall back to stateless Basic auth if enabled/allowed

No UI should depend on cookie existence anymore.

### 3. Fix logging so it matches the real auth mode
Right now the logs are cookie-oriented. For your tenant that is misleading.

Update `middleware/src/util/sessionLog.js` and its call sites so logs are mode-aware:

#### For stateful cookie mode
```text
[SAP] GET /GateHeader  auth=basic session=ACTIVE savedAt=... expiresAt=... remaining=...
```

#### For auto-fallback stateless mode
```text
[SAP] GET /GateHeader  auth=basic_stateless source=auto-fallback cookies=none
```

#### On fallback event
```text
[SAP] LOGIN no-cookies -> switching to auth=basic_stateless
```

#### For OAuth mode
```text
[SAP] GET /GateHeader  auth=oauth_cc token=active expiresAt=...
```

Important:
- `savedAt` / `expiresAt` only make sense when a real cookie session or OAuth token exists.
- In stateless Basic mode there is **no session expiry**, because each request sends fresh credentials.

### 4. Return the effective mode from health checks
Update `middleware/src/routes/health.js` and `getAuthInfo()` in `middleware/src/sapClient.js` so the frontend receives:
- configured auth mode
- effective auth mode
- whether cookies are active
- whether stateless fallback is active

Example response:
```json
{
  "ok": true,
  "authMode": "basic",
  "effectiveAuthMode": "basic_stateless",
  "cookieSession": false,
  "statelessFallback": true
}
```

This prevents the frontend from showing misleading “auto-managed cookies” wording.

### 5. Correct the SAP Settings wording
Update `src/pages/SAPSettings.tsx`:
- replace cookie-specific text like:
  - “JSESSIONID and __VCAP_ID__ cookies are obtained automatically...”
- with auth-mode-neutral text like:
  - “SAP authentication is handled automatically by the middleware. Depending on your tenant, it will use session cookies, stateless Basic auth, or OAuth.”

Also update the status card to display:
- Stateful cookie session
- Stateless Basic auth
- OAuth client credentials

whichever is actually active.

### 6. Improve frontend error handling for the transition case
Update:
- `src/components/SapLiveTable.tsx`
- `src/pages/DMRNew.tsx`

Behavior:
- if backend auto-fallback succeeds, no error is shown.
- if backend still returns `sap_no_cookies`, show a smaller message:
  - “This SAP tenant does not issue browser session cookies. Middleware must use stateless Basic auth or OAuth.”
- stop telling the user to do manual browser-cookie steps.

### 7. Clarify runtime configuration
Update:
- `middleware/.env.example`
- `middleware/README.md`

Clarify that:
- `.env.example` is only a template
- the running server uses `middleware/.env` or deployment env vars
- if the server is already deployed with `SAP_AUTH_MODE=basic`, it will keep failing until the real runtime config or fallback code is in place

## Files to change
- `middleware/src/sapClient.js`
- `middleware/src/sapSessionStore.js`
- `middleware/src/util/sessionLog.js`
- `middleware/src/routes/health.js`
- `src/pages/SAPSettings.tsx`
- `src/components/SapLiveTable.tsx`
- `src/pages/DMRNew.tsx`
- `middleware/.env.example`
- `middleware/README.md`

## Expected result
- `GET /api/gate/headers` stops failing with `sap_no_cookies`.
- Save/submit calls stop failing for the same reason.
- No manual SAP login or manual cookie entry is needed.
- Middleware terminal logs clearly show whether it is using:
  - cookie session with `savedAt/expiresAt`, or
  - stateless Basic auth with no expiry, or
  - OAuth token expiry.

## Small unrelated cleanup to include while editing
There is also an existing React warning in the console:
- `Function components cannot be given refs` in `SapLiveTable`

While touching the same area, fix the dialog/ref issue so the SAP table screen is clean during testing.

