# Fix: middleware crash "getaddrinfo ENOTFOUND https://...ngrok-free.dev" — follow the other project's .env style

## Cause
In your other project, the ngrok address goes in `APP_BASE_URL`. This middleware has no `APP_BASE_URL`, so the ngrok address was put in `HOST`. `HOST` means "which local address to listen on", so Node tried to find a computer named "https://liberty-rerun-greedless.ngrok-free.dev" and crashed.

## What I will change (same style as your other project)
1. **Add `APP_BASE_URL`** to this middleware: the public ngrok / LAN / Nginx address. On startup it prints:
   `Public URL (paste into SAP API Settings → Node.js Middleware URL): https://liberty-rerun-greedless.ngrok-free.dev`
2. **`HOST` stays local only.** If a URL is found in `HOST` (contains `://` or `/`), print a clear warning, treat it as `APP_BASE_URL`, and listen on `127.0.0.1` instead of crashing.
3. **Readable start-up errors**: "port already in use" or bad address show a one-line message instead of a Node stack trace.
4. **Update `middleware/.env.example`** with the same comments as your other project (PORT = local port, APP_BASE_URL = public address).
5. Your existing SAP settings, Basic Auth (no cookies), and proxy secret stay exactly as they are.

## Your .env after the change
```text
HOST=127.0.0.1
PORT=8080
APP_BASE_URL=https://liberty-rerun-greedless.ngrok-free.dev
```
Then: `npm start` in the `middleware` folder, and `ngrok http 127.0.0.1:8080` in another window.

## Quick fix right now (before the change)
Remove the ngrok address from `HOST` and set `HOST=127.0.0.1`. The middleware will start.

## Not changed
Screens, SAP endpoints, Ubuntu server files. (Multi-environment DEV/QUALITY/PROD settings from the other project are not added unless you ask.)
