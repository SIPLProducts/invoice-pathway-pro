# SAP API call history in the Scheduler tab, and live data on All DMR

## Why no data is showing right now
1. **The middleware didn't answer.** At 11:21 the app called `http://127.0.0.1:8080/api/gate/headers` and got "Failed to fetch". That means the middleware on your PC either wasn't running or was still the old copy, without the browser-permission fix. Copy the latest `middleware/src/server.js`, restart with `npm start`, then refresh.
2. **The All DMR screen still shows sample records.** It isn't connected to SAP yet. Only SAP Gate Entries reads live data. This plan connects All DMR to the "Get DMR List" API.
3. **Small mismatch:** Connection & Credentials has Proxy Secret `123456`, but your local middleware `.env` has no secret. That's fine locally because nothing is checked. On the server, both values must match.

## What you will get

### 1. "Recent API Calls" table in SAP API Settings → (any API) → Scheduler tab
Shows the **last 10 calls** for that API:

| Time | Action | Status | HTTP code | Records received | Data size | Time taken | Message |
|---|---|---|---|---|---|---|---|
| 24 Nov 11:30 | Fetch | Success | 200 | 4 | 3.2 KB | 433 ms | — |
| 24 Nov 11:28 | Update | Failed | 401 | 0 | 0.2 KB | 120 ms | Invalid or missing x-proxy-secret |

- **Action** = Fetch (GET), Create (POST) or Update (PATCH).
- **Status** = Success or Failed, with a green or red badge.
- **Message** = the SAP or middleware error, or the created/updated document number on success.
- Click a row to see the **full response SAP returned** (JSON).
- Includes a Refresh button and "Last call: … ago".

### 2. Every SAP call gets recorded
Each of these saves one entry to the history: Gate Entries load, Create DMR, header update, line-item update, PO/OBD lookups, and the "Test connection" button. Passwords and secrets are never saved. Large responses are trimmed to the first 20 KB.

### 3. All DMR screen uses live SAP data
All DMR loads from the "Get DMR List" API, using the same field mapping as Gate Entries. If SAP can't be reached, it shows a clear error banner instead of sample rows.

## Technical details
- New table `public.sap_api_call_logs`: `api_name`, `action` (fetch/create/update/lookup/test), `method`, `url`, `http_status`, `ok`, `record_count`, `bytes`, `duration_ms`, `message`, `response_preview` (jsonb, max 20 KB), `user_id`, `created_at`, plus an index on (`api_name`, `created_at desc`). Grants for authenticated and service_role, RLS on: signed-in users can insert their own rows and read all rows. Rows older than 30 days are deleted when new logs are written.
- New helper `src/lib/sapCallLog.ts` `logSapCall(...)` (fire-and-forget), called from `useSapProxy`, `useSapCreate`, `useSapUpdate`, `useSapItemUpdate`, `useSapPoLookup`, `useSapObdLookup`, and the test call in `SAPSettings.tsx`.
- New component `ApiCallHistory` rendered in the Scheduler tab of `SAPApiEdit.tsx`.
- `DMRList.tsx`: swap the `seed` import for `useSapProxy` with the "Get DMR List" API. Keep the existing columns, filters and export.
