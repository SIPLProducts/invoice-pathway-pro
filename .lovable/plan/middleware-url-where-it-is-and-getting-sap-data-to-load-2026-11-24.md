# Middleware URL: where it is, and getting SAP data to load

## Where the app's middleware address lives
**SAP Module → API Settings → "Middleware & SAP Connection" box → "Node.js Middleware URL".**
It's saved once for the whole app, and every SAP screen uses it (All DMR, Create DMR, PO/OBD lookup, updates). If it's left empty, the app falls back to the `VITE_SAP_PROXY_URL` build setting (`/api` on the Ubuntu server).

It's currently set to `http://127.0.0.1:8080`.

## Why the data still isn't coming
`127.0.0.1` always means "this same computer". The app opens in the Lovable preview, a website on the internet, so Chrome blocks it from calling your PC's `127.0.0.1:8080`. This is strictest inside the editor's preview frame. That's why the screen says "Failed to fetch" and your middleware window shows no incoming request. The SAP login in your `.env` never gets used, because the browser stops the call before it reaches the middleware.

Two other things will also stop data once the connection works:
- `SAP_BASE_URL` in your `.env` still points to the old system (`dde5e873...`) instead of `1f674db9...`.
- The Proxy Secret in the app (`123456`) must exactly match `PROXY_SECRET` in your `.env`.

## The fix: your ngrok address (checked just now)
I called `https://liberty-rerun-greedless.ngrok-free.dev/api/health` and ngrok answered **502, ERR_NGROK_8012**. ngrok is online, but it can't reach the middleware on your PC. On Windows this usually happens because the middleware listens on `127.0.0.1` (IPv4) while `ngrok http 8080` forwards to `localhost`, which Windows sends to IPv6 `::1`.

Steps:
1. Keep the middleware running (`npm start`, showing "listening on http://127.0.0.1:8080").
2. Stop ngrok and start it again with the exact address:
   ```
   ngrok http 127.0.0.1:8080
   ```
3. Check in your browser: `https://liberty-rerun-greedless.ngrok-free.dev/api/health` should show `{"ok":true,"service":"sap-gate-proxy"}`.
4. In **Node.js Middleware URL**, set `https://liberty-rerun-greedless.ngrok-free.dev` and click Save. It's currently `http://127.0.0.1:8080`, which the online app can't reach.
5. Fix `.env`: `SAP_BASE_URL=https://1f674db9-07aa-4869-885b-435d1624cc4c.abap.us10.hana.ondemand.com`, and make `PROXY_SECRET` match the app's Proxy Secret. Restart the middleware.

(On the Ubuntu server the URL stays `/api`, which already works there.)

## App changes
1. **Live "Reachable / Not reachable" badge** next to the Middleware URL. It checks the middleware's health address when you save, open the page, or click Test.
2. **Warning when the URL is `localhost`/`127.0.0.1` but the app isn't running on your PC.** It explains the block and suggests ngrok (or the server URL).
3. **"Test connection" checks in two steps**, so you can see exactly where it fails:
   - Step 1, middleware reachable? (Failed to fetch → URL or browser problem)
   - Step 2, SAP answering? (shows SAP's error, e.g. wrong host, wrong user or password, secret mismatch → 401)
4. **Set the Middleware URL to `https://liberty-rerun-greedless.ngrok-free.dev`** in the saved connection settings, so you don't have to type it in.
5. **SAP Host (reference)** field updated to `https://1f674db9-07aa-4869-885b-435d1624cc4c.abap.us10.hana.ondemand.com` so it matches the new system. It's for display only; the middleware `.env` is still what's used.

## Technical details
- `src/pages/SAPSettings.tsx` (connection card): add `checkHealth()` → `GET {base}/api/health` with a 5 s timeout, badge state, and a localhost-vs-`window.location.hostname` warning. `testSapConnection` runs the health step first and reports `middleware_unreachable` separately from SAP errors.
- Update the `__connection__` row: `middlewareUrl` → the ngrok URL, `sapHost` → the new SAP host. Proxy secret unchanged.
- The health badge shows ngrok's `ERR_NGROK_8012` as "ngrok is online but can't reach the middleware on your PC — start ngrok with `ngrok http 127.0.0.1:8080`".
