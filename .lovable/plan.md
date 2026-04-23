

## Plan: Resolve `sap_auth_redirect` — your SAP user is a dialog user, not a Communication User

### What the error actually means
The middleware is correctly configured and reaching SAP. SAP itself is rejecting the login:

- `SAP_USER=kishore.pabbathi@cbcmpl.com` is an **email-style BTP/IDP login** (a dialog user).
- ABAP Environment (Steampunk) tenants **do not accept Basic auth from dialog/IDP users**. They redirect to the OAuth/SAML login page.
- The middleware sees that HTML redirect, recognizes it as `sap_auth_redirect`, and surfaces the message you see in the screenshot.

This is **not a middleware bug** — the existing code is doing the right thing. The fix has to happen on the SAP side (create a proper service user) plus updating `middleware/.env` with that user's credentials.

### What needs to change

The code is already correct. What's blocking you is one of two SAP-side setups. You need to do **one** of these:

#### Option A — Communication User + Basic auth (simplest, recommended)
1. In SAP Fiori Launchpad, open **Maintain Communication Users** → **New**.
   - Username: e.g. `GATE_COMM_USER`
   - Set a strong password.
2. Open **Communication Systems** → New → host = your SAP host, assign the Communication User above for inbound.
3. Open **Communication Arrangements** → New → choose your scenario (the one exposing `ZUI_GATE_SERVICE`) → assign the Communication System.
4. In `middleware/.env`:
   ```
   SAP_AUTH_MODE=basic
   SAP_USER=GATE_COMM_USER
   SAP_PASSWORD=<the password you set in step 1>
   ```
5. Restart `node server.js`.

#### Option B — OAuth 2.0 client credentials (more secure, long-term)
1. In the same Communication Arrangement, switch the **Inbound** auth method to **OAuth 2.0**.
2. Copy the generated **Token Endpoint**, **Client ID**, **Client Secret**.
3. In `middleware/.env`:
   ```
   SAP_AUTH_MODE=oauth_cc
   SAP_OAUTH_TOKEN_URL=<token endpoint from step 2>
   SAP_OAUTH_CLIENT_ID=<client id>
   SAP_OAUTH_CLIENT_SECRET=<client secret>
   ```
4. Restart `node server.js`.

### Small code-side improvements I will make
While the underlying problem is SAP-side, I'll make the frontend experience clearer so you don't hit a wall of red text:

1. **`src/pages/SAPSettings.tsx`** — When **Test connection** returns `sap_auth_redirect`, show a compact, structured error card with two clearly-labeled "Fix path A / Fix path B" sections instead of one giant paragraph. The current toast/popover dumps everything in one block which is hard to read (visible in your screenshot).

2. **`middleware/src/util/errors.js`** — Tighten the `sap_auth_redirect` hint to a one-line summary and move the long fix instructions into a separate `fixSteps` field on the error envelope. The frontend can render those steps as a numbered list.

3. **`middleware/src/util/errors.js`** — Add an additional detection signal: if the HTML body contains `Communication Arrangement` or `Communication User`, surface a more confident message ("This tenant requires a Communication User — your current SAP_USER is a dialog user").

4. **`src/pages/SAPSettings.tsx`** — Add a small "Auth troubleshooting" expandable panel under the SAP Browser Session card that always lists the two fix paths above, so users don't need to trigger the error to see them.

### What stays the same
- All auth-mode logic, auto-fallback, session store, gate routes — untouched.
- `middleware/.env` schema — untouched. You still set `SAP_AUTH_MODE` + credentials the same way.

### Files to change
- `middleware/src/util/errors.js` — split the hint into `hint` + `fixSteps[]`.
- `src/pages/SAPSettings.tsx` — render the structured error card and the always-visible troubleshooting panel.

### Expected result
- After you create a Communication User in SAP and update `middleware/.env`, restart the middleware. **Test connection** will succeed and DMR list will load.
- Until then, the SAP Settings page will show a clean, readable two-option fix card instead of the wall of text in your screenshot.

### Action you must take in SAP (cannot be done from code)
Create a Communication User as in Option A (or switch to OAuth as in Option B). No amount of code changes in this project can make a dialog/IDP user authenticate via Basic auth against a Steampunk tenant — SAP itself blocks that.

