

## Implement Option A: manual SAP cookie paste + forward through middleware

### Goal

Let the user paste `JSESSIONID` and `__VCAP_ID__` from Chrome DevTools into the app. The app stores them locally and forwards them on every middleware → SAP request as a `Cookie` header, exactly like Postman.

### Flow

```text
User logs into SAP in Chrome
  -> copies JSESSIONID + __VCAP_ID__ from DevTools
  -> pastes into SAP Settings → "SAP Browser Session" card
  -> Save (stored in localStorage)

App request:
Frontend fetch
  headers: x-sap-jsessionid, x-sap-vcap-id
  -> Middleware /api/gate/headers
  -> reads those headers
  -> forwards to SAP as: Cookie: JSESSIONID=...; __VCAP_ID__=...
  -> SAP returns JSON
  -> table renders
```

### Files to change

**Middleware**
- `middleware/src/sapClient.js`
  - `sapGet/sapWrite/sapBatch` accept optional `extraCookies` string.
  - Merge into outgoing `Cookie` header. When cookies are present, skip Basic auth for that request.
  - If SAP still returns the login HTML while cookies were sent, throw `sap_session_expired` with hint "Re-paste fresh JSESSIONID and __VCAP_ID__ from Chrome DevTools."
- `middleware/src/routes/gate.js`
  - Read `x-sap-jsessionid` + `x-sap-vcap-id` from `req.headers`.
  - Build cookie string and pass to every `sapGet/sapWrite/sapBatch` call.
- `middleware/src/routes/health.js`
  - Same header read + forward, so "Test SAP connection" uses the pasted session.
- `middleware/src/server.js`
  - Add `x-sap-jsessionid`, `x-sap-vcap-id` to CORS `allowedHeaders`.

**Frontend**
- `src/lib/sapSession.ts` (new)
  - `getSapSession()`, `setSapSession({ jsessionid, vcapId })`, `clearSapSession()`.
  - `useSapSession()` hook via `useSyncExternalStore`, backed by `localStorage` key `sap.session.cookies.v1`.
- `src/hooks/useSapProxy.ts`
  - On every fetch, read session and add `x-sap-jsessionid` + `x-sap-vcap-id` headers if present.
  - Map `code === "sap_session_expired"` to a clear error with hint.
- `src/hooks/useSapCreate.ts`
  - Same header injection for POST/PATCH.
- `src/pages/SAPSettings.tsx`
  - New "SAP Browser Session" card with two `Input` fields (JSESSIONID, __VCAP_ID__), Save, Clear, and a status badge ("Not set" / "Active" / "Expired").
  - Collapsible "How to get these cookies" with the DevTools steps.
  - Existing "Test SAP connection" button now uses the saved session.
- `src/components/SapLiveTable.tsx`
  - When error code is `sap_session_expired` or `sap_auth_redirect`, show a yellow alert linking to SAP Settings → SAP Browser Session.

### What stays the same

- Table rendering (`GateHeader → value[] → _Item[]`) and items popup — already correct.
- Existing auth modes (`basic`, `bearer`, `oauth_cc`) — cookies are an additional path, not a replacement. If cookies are present, they take precedence for that request.

### Expected result

- Paste cookies once → DMR → SAP Gate Entries shows real `Get_DMR` rows from your live SAP session, exactly like Postman.
- When the SAP session expires, the table shows a clear "Session expired — update cookies in SAP Settings" banner instead of failing silently.
- New DMR (`Create_Gate_Service`) submissions also use the same session automatically.

### Caveats (already discussed, repeated for clarity)

- SAP cookies typically last only a few hours; user must repaste when expired.
- Browsers cannot auto-read cookies from the SAP domain — manual paste is the only purely-in-app option. Long term, switch to Communication User or OAuth in `middleware/.env`.

