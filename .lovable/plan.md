

## Make SAP API Settings Field-Driven & Wire to DMR (List + New DMR Create)

### Goal

Stop hard-coding column lists / form fields. Each SAP API entry stores its own **Request Fields** and **Response Fields** schemas (header + items). The DMR list **SAP Gate Entries** table renders columns from the Response Fields schema. The **New DMR** screen renders inputs and an items table from the Request Fields schema and POSTs to the configured create endpoint via the Node middleware.

---

### 1. Extend the SAP API model (`src/lib/sapApisStore.ts`)

Add per-API config (persisted in localStorage like today, seeded for `ZUI_Gate_Service`):

```ts
type FieldType = "string" | "number" | "date" | "time" | "boolean";

interface FieldDef {
  key: string;          // "gate_id"
  label: string;        // "Gate ID"
  type: FieldType;
  required?: boolean;
  defaultValue?: string;
  showInTable?: boolean;       // (response) include as column
  showInForm?: boolean;        // (request)  include as input
  align?: "left" | "right";
  width?: string;
}

interface SapApi {
  // ...existing
  rowsPath?: string;            // OData "value"
  rowKey?: string;              // "gate_id"
  childKey?: string;            // "_Item"
  requestHeaderFields: FieldDef[];
  requestItemFields: FieldDef[];
  responseHeaderFields: FieldDef[];
  responseItemFields: FieldDef[];
  scheduler: {
    enabled: boolean;
    frequency: "manual" | "5m" | "15m" | "1h" | "1d";
    retryCount: number;
    retryDelayMs: number;
    plants: string[];
  };
  credentials: { user: string; password: string; sapClient: string };
  advanced: { active: boolean; logging: boolean; maxRecords: number; timeoutMs: number; customHeaders: string };
  createEndpoint?: string;      // e.g. ".../GateHeader?sap-client=100"
  listEndpoint?: string;        // e.g. ".../GateHeader?$expand=_Item&sap-client=100"
}
```

Seed `ZUI_Gate_Service` with the exact 21 header keys and 14 item keys from the GET/CREATE payloads you pasted.

---

### 2. Replace the placeholder tabs in `src/pages/SAPApiEdit.tsx`

Each placeholder becomes a real editor that reads/writes the new fields on the API record:

- **Request Fields tab** — two sub-sections: *Header Fields* and *Item Fields*. Editable rows: `Key`, `Label`, `Type`, `Required`, `Show in form`, `Default`. Buttons: **+ Add Field**, **Delete**, **Reset to SAP defaults** (loads the seed list).
- **Response Fields tab** — same UI, with sub-sections *Header Columns* and *Item Columns*; columns: `Key`, `Label`, `Type`, `Show in table`, `Align`, `Width`.
- **Scheduler tab** — matches your screenshot: Enable toggle, Sync Frequency select, Retry Count, Retry Delay (ms), Sync Plants list (checkbox per plant), Sync Schedule Preview.
- **Credentials tab** — matches your screenshot: SAP Username, SAP Password (eye toggle), SAP Client.
- **Settings tab** — matches your screenshot: Active, Enable Logging, Max Records per Sync, Timeout (ms), Custom Headers (JSON), Configuration Summary.
- "Save API Details" persists the whole `SapApi` (all five tabs at once).

A small helper `parseODataSample(jsonText)` lets the user paste a sample response and auto-generate Response Fields (one per top-level key + one per `_Item[0]` key).

---

### 3. Drive `SapLiveTable` from the API record (DMR list "SAP Gate Entries")

`src/components/SapLiveTable.tsx` and `src/lib/sapApiSchemas.ts`:

- Replace the static `GATE_HEADER_SCHEMA` import with a builder `buildSchemaFromApi(api: SapApi): SapApiSchema` that converts `responseHeaderFields` + `responseItemFields` (where `showInTable !== false`) into columns.
- `DMRList.tsx` looks up the API by name (`getSapApi("ZUI_Gate_Service")`), builds the schema, passes it to `<SapLiveTable />`.
- Refresh button continues to call the middleware `GET /api/gate/headers`. Now any change to Response Fields immediately changes the table columns — no code edit.

---

### 4. Drive **New DMR** from the API record (`src/pages/DMRNew.tsx`)

Add a "Source API" indicator at the top (defaults to `ZUI_Gate_Service`, switchable via dropdown of all `live`/`sync` APIs).

Render dynamically:
- **Header section** — one input per `requestHeaderFields[i]` where `showInForm !== false`. Type maps to control: `date` → date input, `number` → numeric input, `time` → time input, `boolean` → switch, else text. `required: true` shows asterisk + validates.
- **Line Items table** — columns from `requestItemFields`. **+ Add line** / row delete. Default 1 empty row.
- **Submit** button calls `POST ${VITE_SAP_PROXY_URL}/api/gate/headers` with body `{ ...header, _Item: [...items] }`. **Save Draft** stores locally (existing `dmrs` seed pattern stays for offline/draft view).
- After successful POST, toast the returned `gate_id` and navigate back to `/dmr` (the list refreshes from SAP).

The hard-coded "Document Information" + "Line Items" sections in `DMRNew.tsx` are replaced by these generic renderers. Tax Summary + Attachments panels stay as-is.

---

### 5. Middleware — already supports this

`middleware/src/routes/gate.js` already exposes `POST /api/gate/headers` proxying SAP's create endpoint and `GET /api/gate/headers` for the list. No middleware change required for this iteration. The endpoint paths inside `sapClient.js` come from `SAP_SERVICE_PATH` in the middleware `.env`, so users can keep configuration in one place.

---

### Files

- Edit: `src/lib/sapApisStore.ts` (extend `SapApi`, seed Gate fields), `src/pages/SAPApiEdit.tsx` (real Request/Response/Scheduler/Credentials/Settings tabs + paste-sample helper), `src/lib/sapApiSchemas.ts` (`buildSchemaFromApi` helper), `src/pages/DMRList.tsx` (build schema from API record), `src/components/SapLiveTable.tsx` (accept dynamic schema; unchanged props), `src/pages/DMRNew.tsx` (dynamic header form + items table + POST to middleware)
- New: `src/components/api-edit/FieldsEditor.tsx` (reusable add/edit/delete table for FieldDef rows used by both Request and Response tabs), `src/hooks/useSapCreate.ts` (POST helper hitting `${VITE_SAP_PROXY_URL}/api/gate/headers`)
- No changes to `middleware/*` for this step

