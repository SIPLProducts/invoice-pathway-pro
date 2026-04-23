# SAP Gate Service — Node Middleware

A small Express proxy that sits between your browser and the public SAP BTP
service `ZUI_GATE_SERVICE` (OData v4). It hides Basic-auth credentials,
manages the CSRF token + JSESSIONID cookie, normalizes the OData responses,
and exposes simple JSON endpoints to the frontend.

## Endpoints exposed to the frontend

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/health` | Health check |
| GET    | `/api/gate/headers` | List all gate headers with `_Item` expanded |
| GET    | `/api/gate/headers/:gateId` | One header + items |
| POST   | `/api/gate/headers` | Create header (with optional `_Item` array) |
| PATCH  | `/api/gate/headers/:gateId` | Update header fields |
| PATCH  | `/api/gate/items/:gateId/:itemNo` | Update one item |
| POST   | `/api/gate/batch` | `$batch` update header + items atomically. Body: `{ "header": {...}, "items": [{ "item_no": "1", ... }] }` |
| DELETE | `/api/gate/headers/:gateId` | Delete a header |

## Setup

```bash
cd middleware
cp .env.example .env
# edit .env with your real SAP_USER / SAP_PASSWORD
npm install
npm start
```

> **Important:** `.env.example` is only a template. The running server reads
> `middleware/.env` (or the deployment's environment variables). Editing
> `.env.example` has no effect — edit `.env` and restart the middleware.

You should see:

```
SAP proxy listening on http://localhost:8080
```

### Auth modes (`SAP_AUTH_MODE`)

| Mode | When to use |
|------|-------------|
| `basic` (default) | Stateful tenants that issue JSESSIONID/__VCAP_ID__ cookies. Middleware logs in once and reuses cookies. **If SAP returns 200 but no cookies, the middleware auto-falls back to `basic_stateless` for the rest of the process.** |
| `basic_stateless` | Stateless tenants. Sends `Authorization: Basic …` on every request. No cookie cache. |
| `bearer` | Static `SAP_BEARER_TOKEN`. |
| `oauth_cc` | OAuth 2.0 client_credentials via a Communication Arrangement. Recommended long-term for ABAP Environment (Steampunk). |


Quick test:

```bash
curl http://localhost:8080/api/gate/headers | jq .
```

## Deploy

Any Node host works (Render, Railway, Fly.io, an EC2 box, your own server).
Steps for **Render**:

1. Push the `middleware/` folder to a GitHub repo.
2. New → Web Service → connect repo → root dir `middleware`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add the env vars from `.env.example` in the Render dashboard.
5. Copy the public URL it gives you (e.g. `https://sap-gate-proxy.onrender.com`).

## Wire into the frontend

In the Lovable project, set:

```
VITE_SAP_PROXY_URL=https://sap-gate-proxy.onrender.com
```

The DMR screen's **SAP Gate Entries** tab will then call `/api/gate/headers`
through this proxy.
