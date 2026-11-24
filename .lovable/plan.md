# Fix: middleware crashes with "getaddrinfo ENOTFOUND https://liberty-rerun-greedless.ngrok-free.dev"

## Cause
In `middleware\.env`, `HOST` is set to the ngrok address. `HOST` is only the local network address the middleware listens on (on your PC). It must not be a website address. Node tries to look up "https://liberty-rerun-greedless.ngrok-free.dev" as a computer name, fails, and stops.

The ngrok address belongs in the app instead: **SAP Module → API Settings → Middleware & SAP Connection → Node.js Middleware URL** (it is already saved there).

## Fix you can do now (no code change)
1. Open `D:\RR\DMR & GRN\invoice-pathway-pro\middleware\.env` and set:
   ```text
   HOST=127.0.0.1
   PORT=8080
   ```
2. Start the middleware from the `middleware` folder: `npm start`
   You should see: `SAP proxy listening on http://127.0.0.1:8080`
3. In a second window: `ngrok http 127.0.0.1:8080`
4. Check in a browser: `https://liberty-rerun-greedless.ngrok-free.dev/api/health` should show `{"ok":true,"service":"sap-gate-proxy"}`
5. In the app, click **Test** in API Settings, then open All DMR.

## Code change (protects against this mistake)
In `middleware/src/server.js`, before starting:
- If `HOST` contains `://`, `/` or looks like a URL, print a clear message such as
  "HOST must be a local address like 127.0.0.1 — put the ngrok URL in the app's Middleware URL, not in .env" and use `127.0.0.1` instead of crashing.
- Add a listen error handler so problems like "port 8080 already in use" or a bad address print a readable message instead of the raw Node stack trace.
- Add a comment in `middleware/.env.example` next to `HOST` explaining the same.

## Not changed
No SAP settings, app screens, proxy secret logic or Ubuntu server files.
