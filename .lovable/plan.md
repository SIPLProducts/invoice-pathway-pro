

## SAP ZUI_GATE_SERVICE — Node Middleware + Configurable DMR Screen

You want three things, all without using Lovable Cloud:

1. A **complete Node.js middleware** (you host it) that proxies the public SAP BTP `ZUI_GATE_SERVICE` OData v4 service (GET / POST / PATCH / $batch / DELETE).
2. A **configurable field-mapping** layer so the same screen can be reused for other SAP APIs by changing only the mapping config — keys from the SAP response map to table column headers.
3. A **DMR screen tab** that lists Gate Headers from the GET endpoint, with a **Refresh** button.

---

### Part A — Node.js middleware (delivered as separate files at the repo root in a new `middleware/` folder; you run it on your own server / Render / Railway / EC2)

Folder layout:

```text
middleware/
  package.json
  .env.example
  README.md
  src/
    server.js           # Express app + CORS + routes
    sapClient.js        # axios instance, Basic auth, CSRF token cache, cookie jar
    routes/
      gate.js           # GET list, GET one, POST, PATCH header, PATCH item, DELETE, $batch
    util/
      batch.js          # builds multipart/mixed $batch body for header+items
      errors.js         # uniform error envelope
```

Key behaviors implemented:

- **Auth**: HTTP Basic (`SAP_USER` / `SAP_PASSWORD`) loaded from `.env`. Base URL also from `.env` (`SAP_BASE_URL=https://fa530628-...hana.ondemand.com`, `SAP_SERVICE_PATH=/sap/opu/odata4/sap/zui_gate_service/srvd_a2x/sap/zui_gate_service/0001`, `SAP_CLIENT=100`).
- **CSRF + cookies**: on first write request, do `HEAD ?$top=0` with `x-csrf-token: fetch`, cache token + `JSESSIONID` cookie in memory (per-process, with TTL); auto-refresh on `403 CSRF token validation failed`.
- **CORS**: `cors()` restricted to your frontend origin (configurable via `ALLOWED_ORIGINS`).
- **Routes** (all return clean JSON to the frontend):
  - `GET  /api/gate/headers`           → proxies `GET GateHeader?$expand=_Item&sap-client=100`
  - `GET  /api/gate/headers/:gateId`   → single header with items
  - `POST /api/gate/headers`           → create header + items (single POST with `_Item` array)
  - `PATCH /api/gate/headers/:gateId`  → update header only
  - `PATCH /api/gate/items/:gateId/:itemNo` → update one item
  - `POST /api/gate/batch`             → accepts `{ header: {...patch}, items: [{item_no, ...patch}] }`, builds multipart `$batch` with one changeset, posts to `/$batch?sap-client=100`, parses response and returns clean JSON
  - `DELETE /api/gate/headers/:gateId` → delete
  - `GET  /api/health`                 → `{ ok: true }`
- **Error envelope**: `{ error: { code, message, sapStatus, sapBody } }`.
- **Logging**: `morgan('tiny')` + redaction of Authorization header.
- Dependencies: `express`, `axios`, `cors`, `dotenv`, `morgan`, `tough-cookie`, `axios-cookiejar-support`.

The README will include exact `npm install`, `npm start`, sample curl, and a "Deploy to Render" 3-step section. After you deploy it, you give me the public URL (e.g. `https://my-sap-proxy.onrender.com`) and I plug it into the frontend as `VITE_SAP_PROXY_URL`.

---

### Part B — Configurable mapping layer (frontend)

A single config drives column headers, field paths, formatters, and which middleware endpoint to hit. Same screen works for any future SAP API by adding another entry.

New file `src/lib/sapApiSchemas.ts`:

```ts
export type ColumnDef = {
  header: string;          // shown in table header
  path: string;            // dot path into row, e.g. "vendor_name" or "_Item.0.material"
  format?: "date" | "time" | "number" | "text";
  align?: "left" | "right";
  width?: string;
};

export type SapApiSchema = {
  id: string;                          // "zui_gate_service"
  label: string;                       // "SAP Gate Entries"
  proxyPath: string;                   // "/api/gate/headers"
  rowsPath: string;                    // "value"  (OData collection key)
  rowKey: string;                      // "gate_id"
  columns: ColumnDef[];
  childKey?: string;                   // "_Item" for expand rows
  childColumns?: ColumnDef[];
};
```

Seed schema for **GateHeader** with these mapped columns (one per requested SAP key):

`gate_id, plant, gate_date, gate_time, vendor, vendor_name, vehicle_no, vehicle_type, driver_name, driver_mobile, transport_type, purpose, document_type, reference_doc, gross_weight, tare_weight, net_weight, entry_type, gate_status, remarks` — and child `_Item` columns: `item_no, material, material_desc, quantity, unit, batch, storage_location, po_number, po_item, weight, remarks`.

Edit `src/lib/sapApisStore.ts`: add a new entry `ZUI_Gate_Service` (type `live`, tag `Direct`, baseUrl = your proxy URL, endpoint = `/api/gate/headers`) so it also shows up in the existing SAP Settings list.

---

### Part C — DMR screen integration

Edit `src/pages/DMRList.tsx`:

- Add a new tab **"SAP Gate Entries"** alongside the existing Draft/Submitted/… tabs.
- When active, render a new component `<SapLiveTable schemaId="zui_gate_service" />` instead of the local DMR table.

New files:

- `src/hooks/useSapProxy.ts` — generic fetcher: `useSapProxy(schema)` returns `{ rows, loading, error, refresh, lastFetched }`. Reads `VITE_SAP_PROXY_URL` from env, calls `${VITE_SAP_PROXY_URL}${schema.proxyPath}`, extracts `rowsPath`.
- `src/components/SapLiveTable.tsx` — generic table:
  - Header row built from `schema.columns[].header`.
  - Body rows rendered via `lodash.get(row, col.path)` + format helper.
  - Expandable row showing `_Item` child table when `schema.childKey` is set.
  - Top-right toolbar: **Refresh** button (lucide `RefreshCw`, spins while loading), "Last updated HH:mm:ss" text, and a small status pill (Live / Error).
  - Empty + error + loading skeleton states.
- `src/lib/getPath.ts` — tiny dot-path getter (no lodash dependency needed).

Frontend env:

- Add `VITE_SAP_PROXY_URL` documentation to README. Until you deploy the middleware, the table shows a friendly "Middleware not configured — set `VITE_SAP_PROXY_URL`" empty state with a copy-curl button.

---

### Technical details (for reference)

- OData v4 collection responses always have `value: [...]`; `rowsPath: "value"` handles that. Single-entity GETs use `rowsPath: ""` (returns object).
- `$expand=_Item` is preserved in the proxy route; the middleware appends `sap-client=100` once (your sample URL has it twice — that's harmless but the proxy normalizes it).
- For PATCH of header+items together, the middleware builds the exact `multipart/mixed; boundary=batch_boundary` body shown in your doc, including `If-Match: *` and `Content-ID` per change, and parses the multipart response back into `{ header, items }`.
- Mapping is pure config — to add a new SAP API later (e.g. MB52), drop another `SapApiSchema` entry and one new proxy route; no UI code changes.
- No Lovable Cloud / Supabase used anywhere. All secrets live in your Node `.env`.

### Files

- New (middleware repo, separate folder, you deploy): `middleware/package.json`, `middleware/.env.example`, `middleware/README.md`, `middleware/src/server.js`, `middleware/src/sapClient.js`, `middleware/src/routes/gate.js`, `middleware/src/util/batch.js`, `middleware/src/util/errors.js`
- New (frontend): `src/lib/sapApiSchemas.ts`, `src/lib/getPath.ts`, `src/hooks/useSapProxy.ts`, `src/components/SapLiveTable.tsx`
- Edit (frontend): `src/pages/DMRList.tsx` (add tab + render), `src/lib/sapApisStore.ts` (register `ZUI_Gate_Service`), `README.md` (env var docs)

