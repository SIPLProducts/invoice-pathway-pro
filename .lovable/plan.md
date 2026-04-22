
## Connect SAP Public Cloud → Frontend via Lovable Cloud Edge Function (the "middleware")

You asked: *"I want to connect the public cloud SAP URL through the middleware to the frontend. How can we achieve this?"*

Here's the concrete plan. In Lovable, the "middleware" for a public cloud SAP endpoint is a **Lovable Cloud edge function** (Deno serverless). It solves three problems the browser can't solve on its own:

1. **CORS** — SAP BTP does not send `Access-Control-Allow-Origin`, so the browser blocks direct calls.
2. **Credential safety** — your SAP username/password must never live in frontend code.
3. **Auth handshake** — Basic Auth + `sap-client` + CSRF cookies are easier to manage server-side.

### Architecture

```text
 Browser (React)                Lovable Cloud Edge Function           SAP BTP Public Cloud
 ────────────────              ──────────────────────────────         ────────────────────────
  DMR screen                    sap-gate-header                        /sap/opu/odata4/.../GateHeader
   │  supabase.functions        │  - reads SAP_USER / SAP_PASS         │  ?sap-client=100
   │   .invoke('sap-gate-       │    from secret store                 │
   │    header')        ───►    │  - adds Basic Auth header     ───►   │
   │                            │  - forwards sap-client param          │
   │  JSON rows         ◄───    │  - returns JSON + CORS headers ◄───  │  OData JSON response
```

No on-prem Node middleware needed. The edge function IS the middleware for this public cloud endpoint.

### What we'll build

1. **Enable Lovable Cloud** on the project (one-click; needed to host the edge function and the secret store).
2. **Store SAP credentials as secrets** — `SAP_BTP_USER`, `SAP_BTP_PASSWORD`, `SAP_BTP_BASE_URL`. You'll be asked once, values go into the encrypted secret store, never into git.
3. **Edge function `sap-gate-header`** (`supabase/functions/sap-gate-header/index.ts`):
   - Accepts optional query params (e.g. `$top`, `$filter`, `sap-client`).
   - Calls `${SAP_BTP_BASE_URL}/sap/opu/odata4/sap/zui_gate_service/srvd_a2x/sap/zui_gate_service/0001/GateHeader?sap-client=100`.
   - Sends `Authorization: Basic base64(user:pass)` and `Accept: application/json`.
   - Returns the OData `value` array as JSON with full CORS headers.
   - Maps SAP errors (401/403/404/5xx) to clean messages so the UI can show a useful banner.
4. **Frontend hook `useSapGateHeader()`** using TanStack Query:
   - Calls `supabase.functions.invoke('sap-gate-header')`.
   - Handles loading / error / empty states.
   - 60s stale time, manual refetch.
5. **DMR screen integration** — a new "SAP Gate Entries" tab in `src/pages/DMRList.tsx` showing the live SAP rows in a table (Gate No, Vehicle, Vendor, Material, Qty, Posting Date, Status) with a Refresh button and last-updated timestamp.
6. **Wire it into SAP API Settings** — register a `GateHeader` entry in `sapApisStore.ts` so it shows up in the Configurations table and is editable from the existing UI (URL/sap-client are read from the registry; auth stays server-side).

### What you'll do (only once)

- Approve enabling Lovable Cloud.
- Paste your SAP BTP **username**, **password**, and **base URL** (`https://fa530628-...hana.ondemand.com`) into the secret prompt that appears.

That's it. After that the DMR screen will show live `GateHeader` data, and the credentials stay encrypted server-side.

### Technical notes

- Edge function uses `corsHeaders` on every response (including errors), handles `OPTIONS` preflight.
- Input validated with Zod (`$top`, `$skip`, `$filter`, `sapClient`).
- Timeouts: 20s fetch with `AbortController`; returns 504 on timeout.
- Logs request id + status code (no credentials, no PII).
- `verify_jwt` left at default; we can tighten to require an authenticated user later.
- Future on-prem APIs (`10.10.6.115`) still require the Node middleware — only this public BTP endpoint can skip it.

### Files

- New: `supabase/functions/sap-gate-header/index.ts`, `src/hooks/useSapGateHeader.ts`, `src/components/SapGateHeaderTable.tsx`
- Edit: `src/pages/DMRList.tsx` (add tab), `src/lib/sapApisStore.ts` (register GateHeader entry)
- Secrets added: `SAP_BTP_USER`, `SAP_BTP_PASSWORD`, `SAP_BTP_BASE_URL`
