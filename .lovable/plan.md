

## Plan: Persist Manual JSESSIONID across reloads + show expiry status

### Current behaviour
Manual cookies are already persisted in `localStorage` under `sap.session.v1` via `src/lib/sapSession.ts`. They survive page reloads. What's missing:
1. No visible "expiry" concept on the client — user can't tell when SAP rejected the saved cookies vs. when they're still valid.
2. When SAP returns 401/403 (cookies expired), the UI still shows the old cookies as if they're fine.
3. After expiry, the user has to manually click **Clear** before pasting fresh cookies — friction.

### Changes

**1. `src/lib/sapSession.ts` — add expiry tracking**
- Add `expiresAt: string` (ISO) and `status: "active" | "expired" | "unknown"` to the `SapSession` shape.
- New helper `markSapSessionExpired()` — sets `status: "expired"` without wiping the cookie values (so user can see what was there and decide to re-paste).
- New helper `markSapSessionActive()` — sets `status: "active"` and refreshes `savedAt` whenever a SAP call succeeds with manual cookies.
- On `setSapSession(...)`: default `status: "active"`, compute `expiresAt = savedAt + SAP_MANUAL_TTL_HOURS` (default 4h, mirroring middleware `SAP_SESSION_TTL_HOURS`).
- `getSapSessionHeaders()` keeps returning headers even when `status === "expired"` (so the user's next test call goes through and we learn the real state from SAP's response).

**2. `src/pages/SAPSettings.tsx` — surface saved cookies + expiry on load**
- On mount, the Manual tab already pre-fills inputs from `useSapSession()`. Confirm masked previews (`JSESSIO…abc123`) render whenever cookies exist, even before the user types.
- Add a status row under the inputs:
  - `status === "active"` → green dot + "Active. Saved 12m ago. Expires in 3h 48m."
  - `status === "expired"` → amber dot + "Expired. Paste fresh cookies and click Save."
  - `status === "unknown"` → muted dot + "Saved 2d ago. Click Test connection to verify."
- After `testSapConnection()` finishes:
  - On HTTP 200 → call `markSapSessionActive()`.
  - On `sap_auth_redirect` / 401 / 403 → call `markSapSessionExpired()`.
- The **Save** button now also resets `status: "active"` and `expiresAt` automatically.
- Inputs are NOT cleared when status flips to expired — user sees the old cookies, can compare, and overwrite directly.

**3. `src/hooks/useSapProxy.ts` and `src/hooks/useSapCreate.ts` — auto-flag expiry on real SAP calls**
- After every fetch, if response is 401/403 OR error code is `sap_auth_redirect`, call `markSapSessionExpired()` so the SAP Settings badge updates even if user never clicked Test.
- On 2xx response in manual mode, call `markSapSessionActive()`.

### Behaviour matrix

| Scenario | What user sees on /sap/settings (Manual tab) |
|---|---|
| Fresh visit, never saved | Empty inputs, "Manual — not set" badge |
| Saved 10 min ago, working | Pre-filled masked cookies, green "Active. Expires in 3h 50m" |
| Saved yesterday, SAP just rejected | Pre-filled masked cookies, amber "Expired. Paste fresh cookies" |
| Saved 2h ago, never tested | Pre-filled masked cookies, muted "Saved 2h ago. Click Test connection to verify" |

### What stays the same
- `localStorage` key (`sap.session.v1`) and the existing Auto/Manual toggle.
- Middleware code, all hooks' fetch logic — only adding two function calls (`markSapSessionActive`/`markSapSessionExpired`) at response-handling points.
- `getSapSessionHeaders()` continues to return headers whenever cookies exist; the middleware decides validity.

### Files to change
- `src/lib/sapSession.ts` — add `expiresAt`, `status`, helpers (~30 added lines).
- `src/pages/SAPSettings.tsx` — render status row, wire test-result into mark helpers (~25 added lines).
- `src/hooks/useSapProxy.ts` — call mark helpers after fetch (~6 lines).
- `src/hooks/useSapCreate.ts` — call mark helpers after fetch (~6 lines).

### Expected result
Reload the page after saving Manual cookies → inputs are pre-filled and a green "Active, expires in N h" badge shows. When SAP eventually rejects them (4 h later, or after a logout), the badge flips to amber "Expired" and the inputs stay populated so you can paste the new JSESSIONID/__VCAP_ID__ directly over the old ones and click Save again.

