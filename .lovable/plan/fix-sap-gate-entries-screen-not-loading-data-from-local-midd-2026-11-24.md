# Fix: SAP Gate Entries screen not loading data from local middleware

## Why this is happening

1. **The `PROXY_SECRET not set` line is only a warning, not an error.** Your middleware started fine on `http://127.0.0.1:8080` with plain Basic Auth (`mode=basic_stateless user=ZGATE_POSTMAN`). On your own PC that's fine. It only means the middleware doesn't ask for a shared secret.
2. **The real problem is in the Gate Entries screen.** Your browser log shows `Maximum update depth exceeded` in the SAP Gate Entries table. The screen re-renders itself in an endless loop, so the data never settles and the page can freeze.
3. **The browser may block calls from the online preview to your PC.** Chrome asks a local server (127.0.0.1) to send an extra permission header. The middleware doesn't send it yet, so requests from the Lovable preview to your laptop can fail.

## Changes

### 1. Stop the endless loop on SAP Gate Entries
- `src/pages/SapGateEntries.tsx`: build the table settings **once** per selected API with `useMemo`. Right now they are rebuilt on every render, and that rebuild is what starts the loop.
- `src/components/SapLiveTable.tsx`: only report data back to the page when rows, selection or columns actually change.

### 2. Let the browser reach the local middleware
- `middleware/src/server.js`: answer the browser's permission check with `Access-Control-Allow-Private-Network: true`. This lets the preview (and the Ubuntu site) call `http://127.0.0.1:8080`.

### 3. Make the startup message clear (code kept, warning stays)
- `middleware/src/server.js`: reword the warning so it says this is OK for local testing. It also tells you how to turn the secret on: set `PROXY_SECRET=...` in `.env` and enter the same value under SAP API Settings → Connection & Credentials. Security behavior doesn't change (a secret set means it's enforced; `REQUIRE_PROXY_SECRET=true` still refuses to start without one).

## How you will test (on your PC)
1. `cd middleware` → `npm start` (you'll see `mode=basic_stateless`).
2. In the app, open SAP API Settings → Connection & Credentials. Set the Middleware URL to `http://127.0.0.1:8080`. Leave the Proxy Secret empty, since the local `.env` has none.
3. Open SAP Gate Entries and click Refresh. Your gate entries (e.g. GateId `2007260001`) should appear, and the screen should stop freezing.

## Not changed
- Cookie code stays switched off (not deleted), and Basic Auth is still sent on every request.
- No SAP passwords go into the app. They stay only in `middleware/.env`.
- Note: the password is visible in the screenshot, so please change it in SAP after testing.
