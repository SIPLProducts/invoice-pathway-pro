

## Plan: Fix `ReferenceError: useBasicStateless is not defined`

### Root cause
In `middleware/src/sapClient.js`, the variable was renamed to `configuredBasicStateless` (line 32), but two leftover references to the old name `useBasicStateless` remain:

- **Line 57** — in the warn-check: `(useBasic || useBasicStateless) && (!SAP_USER || !SAP_PASSWORD)`
- **Line 67** — in the startup banner ternary: `: useBasicStateless`

Node throws on line 67 the moment the file is evaluated, which is why the server crashes immediately on `node server.js`.

### Fix
Single-file edit in `middleware/src/sapClient.js`:

- Line 57 → replace `useBasicStateless` with `configuredBasicStateless`.
- Line 67 → replace `useBasicStateless` with `configuredBasicStateless`.

That's the entire change. No other files, no logic changes, no env changes.

### What stays the same
- `.env`, auth modes, auto-fallback behavior, session store, logging — all untouched.
- `effectiveBasicStateless` (runtime flag) is intentionally separate from `configuredBasicStateless` and stays as-is.

### Expected result
- `node server.js` starts cleanly and prints:
  ```
  [sapClient] mode=basic user=kishore.pabbathi@cbcmpl.com (auto-cookie session enabled)
  SAP proxy listening on http://localhost:8080
  ```
- The first call to `/api/gate/headers` will then trigger the existing auto-fallback path (cookie login → `sap_no_cookies` → switch to `basic_stateless` → continue), and the DMR table loads without the red banner.

