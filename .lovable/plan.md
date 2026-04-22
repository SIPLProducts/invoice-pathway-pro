

## Fix: SAP tenant is rejecting Basic auth — middleware must use Bearer token

### What is actually happening

Your middleware is correctly reaching SAP. The proxy is healthy. The error is **not** a code bug.

```
Middleware -> SAP /GateHeader?$expand=_Item
SAP -> HTML page with "fragmentAfterLogin" + "locationAfterLogin" cookies
       (this is the SAP BTP IDP / OAuth login interstitial)
Middleware -> correctly detects HTML, returns 502 sap_auth_redirect
UI -> shows "Failed to load from SAP"
```

The HTML SAP returned (`fragmentAfterLogin`, `signature=...`, `Secure;SameSite=None`) is the **SAP BTP IAS / XSUAA login redirect**. This tenant:

```
fa530628-e5cb-4817-8c70-9991654babd5.abap-web.us10.hana.ondemand.com
```

is an **ABAP Environment / Steampunk** tenant. These tenants do **not** accept plain Basic auth from a normal BTP user for OData v4 service calls from outside — they require either:

1. A **Communication User** (created via a Communication Arrangement in SAP) — this user *can* use Basic auth, OR
2. An **OAuth 2.0 Bearer token** obtained from the tenant's XSUAA / token endpoint.

Your current `SAP_USER` / `SAP_PASSWORD` is almost certainly your normal developer/BTP login, which is why SAP is bouncing the middleware to the IDP login page.

So the fix is **configuration, not code** — but I will also add small code improvements so this is easier next time.

---

### Plan

#### Step 1 — Decide which auth path to use (you must pick one)

Option A — **Communication User + Basic auth** (simplest, recommended)
- In SAP Fiori Launchpad of the ABAP tenant: open **Maintain Communication Users** → create a user (e.g. `GATE_PROXY`) with a strong password.
- Open **Communication Arrangements** → create one for the scenario that exposes `ZUI_GATE_SERVICE` (or assign it to an existing arrangement) → assign the new Communication User as Inbound user.
- Put those credentials into `middleware/.env`:
  ```
  SAP_AUTH_MODE=basic
  SAP_USER=GATE_PROXY
  SAP_PASSWORD=<the password you set>
  ```

Option B — **OAuth Bearer token**
- In the same Communication Arrangement, switch Authentication Method to **OAuth 2.0**.
- SAP gives you `clientid`, `clientsecret`, and a `tokenurl` (XSUAA).
- Fetch a token via client_credentials and put it in `.env`:
  ```
  SAP_AUTH_MODE=bearer
  SAP_BEARER_TOKEN=<token>
  ```

#### Step 2 — Code: auto-fetch & refresh OAuth token (so you don't paste tokens manually)

Since manually pasting bearer tokens expires every hour, I will extend `middleware/src/sapClient.js` to support a third mode:

```
SAP_AUTH_MODE=oauth_cc
SAP_OAUTH_TOKEN_URL=https://<subaccount>.authentication.us10.hana.ondemand.com/oauth/token
SAP_OAUTH_CLIENT_ID=...
SAP_OAUTH_CLIENT_SECRET=...
```

Behavior:
- On first call, POST `grant_type=client_credentials` to the token URL.
- Cache the `access_token` until ~60s before `expires_in`.
- Inject `Authorization: Bearer <token>` automatically on every SAP request.
- On `401` from SAP, force-refresh the token once and retry.

This means once the Communication Arrangement is set to OAuth 2.0, the middleware just works with no manual token paste.

#### Step 3 — Better diagnostics in the middleware

Update `middleware/src/sapClient.js`:
- Log which auth mode is active on startup (`[sapClient] mode=basic user=GATE_PROXY` or `mode=oauth_cc tokenUrl=...`).
- On `sap_auth_redirect`, also log a one-line hint: *"This usually means the SAP user is a dialog/IDP user, not a Communication User. See README."*

Update `middleware/src/util/errors.js`:
- Include `hint` field in the error envelope so the UI shows actionable text.

#### Step 4 — Better UI error in `src/hooks/useSapProxy.ts` and `SapLiveTable.tsx`

- When `code === "sap_auth_redirect"`, render a yellow alert with:
  - The exact `.env` keys that need to be set
  - A "Test connection" link that calls a new `/api/health/sap` endpoint
- Add a small "Show diagnostics" toggle that displays the proxy URL, auth mode, and last upstream status.

#### Step 5 — Add `/api/health/sap` endpoint

In `middleware/src/server.js` (or a new `routes/health.js`):
- `GET /api/health/sap` calls `GET /GateHeader?$top=1` and returns:
  ```json
  { "ok": true, "authMode": "basic", "sapStatus": 200, "rows": 1 }
  ```
  or
  ```json
  { "ok": false, "code": "sap_auth_redirect", "authMode": "basic", "hint": "..." }
  ```
- Frontend "Test connection" button on **SAP Settings** page calls this and shows the result inline.

#### Step 6 — Update `middleware/.env.example` and `middleware/README.md`

- Document all three auth modes (`basic`, `bearer`, `oauth_cc`) with required env keys.
- Add the Communication User / Communication Arrangement steps as a checklist.
- Note that `SAP_USER` must be a **Communication User**, not a BTP developer user.

---

### Files to change

- `middleware/src/sapClient.js` — add `oauth_cc` mode + token cache + auto-refresh + 401 retry + startup log.
- `middleware/src/util/errors.js` — add `hint` field on `sap_auth_redirect`.
- `middleware/src/server.js` — mount new health route.
- `middleware/src/routes/health.js` — new file with `/api/health/sap`.
- `middleware/.env.example` — add OAuth client_credentials keys.
- `middleware/README.md` — auth setup checklist.
- `src/hooks/useSapProxy.ts` — surface `hint` and `code`.
- `src/components/SapLiveTable.tsx` — render structured auth-error alert.
- `src/pages/SAPSettings.tsx` — add "Test SAP connection" button hitting `/api/health/sap`.

---

### What you must do (cannot be done from code)

The **root cause is on the SAP side** — no code change can authenticate a user that the SAP tenant refuses. You must, in SAP:

1. Create a **Communication User** in the ABAP tenant.
2. Create/extend a **Communication Arrangement** that exposes `ZUI_GATE_SERVICE` and assigns that Communication User as Inbound.
3. Put those credentials (or the OAuth client_id/secret it generates) into `middleware/.env`.
4. Restart `node server.js`.

After that, the existing UI code will already render `Get_DMR` rows + the items popup — the table layer is already correct, it has just never received real JSON.

---

### Expected result

- `node server.js` startup line will print: `[sapClient] mode=basic user=GATE_PROXY` (or oauth_cc).
- `GET /api/health/sap` returns `{ ok: true, sapStatus: 200 }`.
- DMR → SAP Gate Entries shows header rows from `value[]` and the **Items** button opens the popup with `_Item[]`.
- If auth ever breaks again, the UI shows the exact `.env` key to fix instead of a blank table.

