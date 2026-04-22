
## Why your browser shows data but the application does not

### Root cause

The problem is not the DMR table UI first. The failure happens before the table gets any rows.

Your app is calling:

```text
Lovable frontend
-> https://donation-pantyhose-starter.ngrok-free.dev/api/gate/headers
-> middleware
-> SAP /GateHeader?$expand=_Item
-> SAP returns login HTML
-> middleware returns 502 sap_auth_redirect
-> table receives no JSON rows
```

The network snapshot from the app shows exactly this:

```text
GET /api/gate/headers -> 502
code: sap_auth_redirect
message: SAP redirected to login (OAuth/SAML/IDP)
```

So the table is empty because the middleware never received the JSON payload from SAP.

### Why it works in the browser

When you paste the SAP OData URL directly into your browser:

```text
https://.../GateHeader?$expand=_Item&sap-client=100
```

the SAP tenant asks **you** to log in interactively. After you type username/password, SAP creates a browser session/cookie for that SAP domain, and then the JSON opens in that same browser tab.

That proves only this:

- your browser user can access the service interactively

It does **not** prove this:

- the Node middleware is authenticated

### Why it still fails in the application after you typed username/password

Because the application is **not using your browser’s SAP login session**.

The app does not call the SAP URL directly. It calls the middleware URL:

```text
https://donation-pantyhose-starter.ngrok-free.dev/api/gate/headers
```

Then the middleware uses its own server-side credentials from its environment/config to call SAP.

So these are two different authentication contexts:

```text
Browser manual login session      !=      Middleware server-to-server auth
```

Your SAP login in Edge/Chrome cannot be reused automatically by:

- Node.js middleware
- ngrok URL
- the Lovable preview app

### What the screenshots prove

1. Screenshot 1:
   SAP is redirecting to the XSUAA/IDP login page.
   That means the tenant expects an authenticated SAP session, not anonymous access.

2. Screenshot 2:
   After interactive login, browser gets JSON successfully.
   So the OData service itself is fine.

3. Screenshot 3:
   The app still gets `sap_auth_redirect`.
   So middleware authentication is still not valid for this tenant.

### What is actually wrong in this project

The middleware code is already detecting this case on purpose:

- `middleware/src/sapClient.js`
- `middleware/src/util/errors.js`

If SAP returns HTML instead of JSON, it throws `sap_auth_redirect`.

So the current issue is:

- not a table mapping issue
- not a `Get_DMR` schema issue
- not an item-popup issue
- not a CORS issue

It is an SAP authentication mode mismatch for the middleware.

### Most likely SAP-side cause

This ABAP Environment tenant is redirecting regular user credentials to SAP login/IDP flow.

That usually means the middleware is using one of these invalid approaches:

- a normal dialog/BTP user in `SAP_USER` / `SAP_PASSWORD`
- credentials that only work interactively in a browser
- no valid bearer token / OAuth client credentials

For middleware, SAP usually needs one of these:

1. **Communication User + Basic auth**
2. **OAuth 2.0 client credentials / bearer token**

### Important note about your URL

Your sample URL has:

```text
...?$expand=_Item&sap-client=100?sap-client=100
```

There is a duplicated `sap-client` with `?` again.

It should be only one of these forms:

```text
.../GateHeader?$expand=_Item&sap-client=100
```

or if there are no earlier query params:

```text
.../GateHeader?sap-client=100
```

This should be cleaned up, but it is not the main blocker because your browser still returned data after login.

## What needs to be done to make the app work

### Option A — Communication User
Configure the middleware with a real SAP Communication User that is allowed to call this OData service directly:

```text
SAP_AUTH_MODE=basic
SAP_USER=<communication user>
SAP_PASSWORD=<communication password>
```

### Option B — OAuth client credentials
Use OAuth for the middleware:

```text
SAP_AUTH_MODE=oauth_cc
SAP_OAUTH_TOKEN_URL=...
SAP_OAUTH_CLIENT_ID=...
SAP_OAUTH_CLIENT_SECRET=...
```

This is usually the safer option for ABAP Environment tenants.

### Verification target

After fixing middleware auth, this must succeed:

```text
GET /api/health/sap
-> { ok: true, sapStatus: 200, rows: ... }
```

Then the DMR page will receive real JSON like:

```json
{
  "value": [
    {
      "gate_id": "A123I00005",
      ...
      "_Item": [ ... ]
    }
  ]
}
```

and the existing UI will work as intended:

- header rows show in the main table
- `_Item` opens in the popup dialog

## Technical details

### Current frontend behavior
`src/hooks/useSapProxy.ts`
- fetches `proxyUrl + schema.proxyPath`
- expects JSON
- shows the middleware error if response is 502

### Current table behavior
`src/components/SapLiveTable.tsx`
- renders rows from `schema.rowsPath`
- for gate APIs that is `value`
- opens `_Item` in the popup when row data exists

### Current schema behavior
`src/lib/sapApiSchemas.ts`
- gate APIs default to:
  - `rowsPath: "value"`
  - `rowKey: "gate_id"`
  - `childKey: "_Item"`

So once middleware auth is fixed, the current table design should already display your header rows and item popup.

## Implementation plan

1. Keep the DMR UI as-is because the rendering path is already correct for `GateHeader -> value[] -> _Item[]`.
2. Reconfigure the middleware to use SAP credentials that work server-to-server, not browser-only interactive login.
3. Verify `/api/health/sap` returns `ok: true`.
4. Retest `/api/gate/headers` until it returns JSON instead of `sap_auth_redirect`.
5. If needed, do a small cleanup to remove the duplicated `sap-client` query parameter in any saved SAP endpoint configuration.

## Expected result after the fix

- SAP Gate Entries tab loads `Get_DMR` rows
- Header data appears in the table
- Item button opens popup with `_Item` rows
- No more `sap_auth_redirect` banner in the app
