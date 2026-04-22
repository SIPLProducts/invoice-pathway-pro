

## Drive DMR List + New DMR from the configured API record (no env var required)

### What's broken right now

1. **DMR → "SAP Gate Entries" tab** is hard-coded to look up `ZUI_Gate_Service` only. If you created an entry called `Get_DMR`, this tab can't see it.
2. The live table + create hook only read `import.meta.env.VITE_SAP_PROXY_URL`. The **ngrok / Middleware URL** you type on the API Edit screen is never persisted and never used → the table shows "Proxy not configured" and never calls SAP.
3. **New DMR** filters the source API dropdown so only `ZUI_Gate_Service` (or APIs that already have request fields) appears, so a freshly-created `Get_DMR` is invisible. When the API record has no request fields, the form shows the "no fields configured" empty state instead of letting the user pick a different API or auto-deriving fields from the response schema.
4. The **Settings → API Details** form fields (`Middleware URL`, `Middleware Port`, `Proxy Secret`, `SAP Client`, `Timeout`) are kept only in local component state — they are dropped on save.

### Fix plan

#### 1. Persist the middleware URL + secret on each `SapApi`

`src/lib/sapApisStore.ts` — extend `SapApi`:
```ts
middleware?: {
  url: string;          // e.g. "https://abcd.ngrok-free.app"  or "http://10.10.4.178:3202"
  port?: string;
  secret?: string;      // sent as x-proxy-secret header
  connectionMode?: "Direct" | "Via Proxy Server" | "VPN Tunnel";
  deploymentMode?: string;
}
```
Seed `ZUI_Gate_Service` with sensible defaults.

#### 2. Save the API Details fields

`src/pages/SAPApiEdit.tsx` — bind the local `details` state to `api.middleware.*` and `api.credentials.sapClient` / `api.advanced.timeoutMs` so the Save button writes them through. Pre-fill from the loaded record on edit.

#### 3. Make `useSapProxy` and `useSapCreate` use the per-API middleware URL

`src/hooks/useSapProxy.ts` and `src/hooks/useSapCreate.ts`:
- New signature: accept `api: SapApi` (or the resolved `middlewareUrl` + `proxyPath` + `secret`).
- Resolution order for the base URL: `api.middleware.url` → `VITE_SAP_PROXY_URL` env → none.
- Send `x-proxy-secret` header when `api.middleware.secret` is set.
- `proxyConfigured` is true if any of the two sources resolves a URL.
- Empty-state copy updated: "Set Middleware URL on SAP Settings → {api.name} → API Details, or define VITE_SAP_PROXY_URL."

#### 4. DMR list tab works for **any** live API, not just Gate

`src/pages/DMRList.tsx`:
- Replace the hard-coded `getSapApi("ZUI_Gate_Service")` with: pick the first API where `type === "live"` AND `responseHeaderFields` is non-empty. Fallback to a small dropdown if more than one such API exists.
- Tab label stays "SAP Gate Entries" but renders whichever API is selected. Adds a tiny `<Select>` above the table when multiple live APIs exist.
- Pass the resolved `api` to `<SapLiveTable api={api} schema={buildSchemaFromApi(api)} />`.

`src/components/SapLiveTable.tsx`:
- New prop `api: SapApi`. Passes it into `useSapProxy(api, schema)`.

`src/lib/sapApiSchemas.ts` — `buildSchemaFromApi` already handles dynamic columns. Update `proxyPath` fallback to `/api/gate/headers` only if API has no `listEndpoint`/`proxyPath` set.

#### 5. New DMR shows **all** request-capable APIs

`src/pages/DMRNew.tsx`:
- Source-API dropdown lists every API where `type` is `live` or `sync` (not just Gate). When the selected API has no `requestHeaderFields`, render a one-click **"Auto-generate from response schema"** button that copies `responseHeaderFields`/`responseItemFields` into request fields with `showInForm: true` (in-memory only, with a toast suggesting the user open Settings to refine + save).
- Pass the selected `api` into `useSapCreate(api)` so the POST goes to the configured middleware URL.

#### 6. Refresh button always available when middleware URL is set

`SapLiveTable` — Refresh button is enabled whenever `proxyConfigured` is true (per-API URL or env). Loading spinner unchanged.

### Files

- Edit: `src/lib/sapApisStore.ts` (extend SapApi with `middleware`), `src/pages/SAPApiEdit.tsx` (persist details fields), `src/hooks/useSapProxy.ts` (per-API URL + secret header), `src/hooks/useSapCreate.ts` (same), `src/components/SapLiveTable.tsx` (accept api prop), `src/pages/DMRList.tsx` (auto-pick live API + dropdown), `src/pages/DMRNew.tsx` (broader API dropdown + "Auto-generate from response" button)
- No changes: `middleware/*` (already accepts these calls), `src/components/api-edit/FieldsEditor.tsx`, `src/lib/sapApiSchemas.ts` (only the `proxyPath` fallback line)

### Result

- Create an API named `Get_DMR`, paste its sample JSON in **Response Fields → Auto-detect**, type your **ngrok URL** as Middleware URL, save.
- DMR → "SAP Gate Entries" tab now lists `Get_DMR` columns and the **Refresh** button hits your ngrok middleware.
- New DMR's Source API dropdown shows `Get_DMR`. If you didn't fill in Request Fields, click **Auto-generate from response schema** to populate the header form + line-item table instantly.

