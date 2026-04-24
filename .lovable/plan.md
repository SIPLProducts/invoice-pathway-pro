

## Plan: Add "Edit" action on SAP Gate Entries with dynamic `gate_id` substitution + auto-detect for the Update API

### The two problems

1. **Static `gate_id` in API config.** On the **Update Header Data** API (screenshot 1), the *Endpoint Path* contains a hard-coded `GateHeader(gate_id='A123I00005')`. That value should change per row at runtime.
2. **No edit affordance on the Gate Entries table.** The DMR → SAP Gate Entries tab today is read-only. You want a new **Edit** column → click → header form opens pre-filled → save → middleware PATCH → SAP updates.
3. **Bonus:** the *Auto-detect from sample JSON* button (screenshot 2) currently lives on the **Response Fields** tab only. The Update API also needs **Request → Header / Item** auto-detection from a pasted sample.

### How dynamic `gate_id` will work (no SAP-side change, no middleware change)

The middleware already exposes the dynamic route:

```
PATCH /api/gate/headers/:gateId   →   PATCH /GateHeader(gate_id='<gateId>')
```

So the SAP API config just needs to store an **update endpoint template** that contains a `{gate_id}` placeholder. At click time, the frontend substitutes the selected row's `gate_id` and calls the resolved proxy path.

```
Update Endpoint (proxy path):  /api/gate/headers/{gate_id}
Update Method:                 PATCH
```

For the Edit button row with `gate_id = "A123I00012"`, the frontend hits:
```
PATCH https://<middleware>/api/gate/headers/A123I00012
```
Body = sanitized header payload (matching the payload you pasted).

The static SAP path `GateHeader(gate_id='A123I00005')?sap-client=100` shown in the *Endpoint Path* field stays as a **reference / documentation** value (it's just metadata). What actually drives the call is the new **Update Endpoint** + **Update Method** fields with `{gate_id}` placeholder support.

### Changes

#### 1. `src/lib/sapApisStore.ts` — add update endpoint metadata
Add three optional fields to `SapApi`:
- `updateEndpoint?: string` — proxy path template, e.g. `/api/gate/headers/{gate_id}`
- `updateMethod?: SapMethod` — defaults to `"PATCH"`
- `keyField?: string` — which response field provides the placeholder value (defaults to `rowKey`, i.e. `gate_id`)

Seed `ZUI_Gate_Service` with `updateEndpoint: "/api/gate/headers/{gate_id}"`, `updateMethod: "PATCH"`, `keyField: "gate_id"`.

#### 2. `src/pages/SAPApiEdit.tsx` — surface the new fields
Under the **API Details** tab, next to *List Endpoint* and *Create Endpoint*, add:
- **Update Endpoint (proxy path)** input — placeholder `/api/gate/headers/{gate_id}`, with helper text *"Use `{gate_id}` (or any response field name) as a placeholder. The frontend substitutes it from the selected row at call time."*
- **Update Method** select — default `PATCH`.
- **Key Field** input — placeholder `gate_id`, helper *"Response field used to fill the placeholder."*

#### 3. `src/pages/SAPApiEdit.tsx` — auto-detect for Request fields too
Move the *Auto-detect from sample JSON* control so it appears on **both** the Request Fields tab and the Response Fields tab. Pasting the request-payload JSON you provided will:
- Populate `requestHeaderFields` with each top-level scalar key (skipping `@odata.*`, `SAP__Messages`, `_Item`).
- Populate `requestItemFields` from the first `_Item` entry (when present).
- Infer types (`number`, `date` `YYYY-MM-DD`, `time` `HH:MM:SS`, `boolean`, else `string`).
- Mark all detected request fields with `showInForm: true`.

Reuses the same `inferType` / `prettify` helpers already in this file — the only additions are a second `applyPasteSample` variant for request fields and a paste UI block on the Request tab.

#### 4. `src/components/SapLiveTable.tsx` — add the Edit column
- New prop `onEdit?: (row: Record<string, unknown>) => void`. When provided, the table renders an **Edit** column header (right of the existing Items column) and an `Edit` icon button in each row.
- Button is disabled when the row's key field is missing.

#### 5. New component `src/components/EditHeaderDialog.tsx`
- Props: `api`, `row` (the selected gate entry), `onClose`, `onSaved`.
- Pre-fills inputs from `row` using `requestHeaderFields` (falls back to `responseHeaderFields` filtered to scalar keys when request fields are empty — covers the case where the Update API has only response fields configured).
- On Save: builds the dynamic URL from `api.updateEndpoint` by replacing every `{xxx}` token with `row[xxx]` (URL-encoded). If the placeholder value is missing, shows a clear error and aborts.
- Calls a small new helper (see #6) that PATCHes the resolved URL, sanitizes the body using `requestHeaderFields` (same `sanitizeForSap` pattern), forwards `getSapSessionHeaders()`, and updates session active/expired status.
- Uses `Dialog` + `Input` + the same `coercion()` style as `DMRNew`.

#### 6. `src/hooks/useSapUpdate.ts` — new hook (mirror of `useSapCreate`)
- Same shape as `useSapCreate`, but:
  - Method comes from `api.updateMethod ?? "PATCH"`.
  - URL = `proxyUrl + resolvedTemplate(api.updateEndpoint, row)`.
  - Body = sanitized header (no `_Item` array).
- Returns `{ submit(row, body), loading, proxyConfigured, proxyUrl }`.

#### 7. `src/pages/DMRList.tsx` — wire the Edit action
- Find the Update API the same way the GET API is found today: an Active API whose name/endpoint/proxyPath matches `update.*gate|gate.*update|update[ _-]?header` AND whose `updateEndpoint` is set. Falls back to the same `selectedApi` if its `updateEndpoint` is set.
- Pass `onEdit={(row) => setEditing({ row })}` to `<SapLiveTable>` and render `<EditHeaderDialog api={updateApi} row={editing.row} ...>` when `editing` is set.
- After a successful save, call the table's `refresh()` so the row reflects new values.

### What stays the same
- Middleware: zero changes. `PATCH /api/gate/headers/:gateId` already exists.
- SAP backend: zero changes.
- Existing GET / POST flows, session handling, error UI — untouched.
- Existing `SAPApiEdit` tabs and `FieldsEditor` — only additive new fields/buttons.

### How a user will use it end-to-end
1. **One-time setup** in SAP Settings → *Update Header Data* API:
   - Update Endpoint (proxy path): `/api/gate/headers/{gate_id}`
   - Update Method: `PATCH`
   - Key Field: `gate_id`
   - Open **Request Fields** tab → click **Auto-detect from sample JSON** → paste the request payload you provided → header fields get generated with correct types.
   - (Optional) Same on **Response Fields** tab using the response body you provided.
   - Save.

2. **Daily use** on DMR → SAP Gate Entries:
   - Each row gets an **Edit** icon. Click it.
   - Dialog opens pre-filled with that row's header values.
   - Edit any field → **Save**.
   - Frontend hits `PATCH https://<middleware>/api/gate/headers/A123I00012` with the cleaned body.
   - On success: toast, dialog closes, table refreshes. On error: inline error with the SAP detail message (same pattern as `useSapCreate`).

### Files to change / create
- `src/lib/sapApisStore.ts` — add `updateEndpoint`, `updateMethod`, `keyField` to `SapApi` + seed.
- `src/pages/SAPApiEdit.tsx` — three new inputs in API Details; replicate the paste UI on the Request tab.
- `src/components/SapLiveTable.tsx` — optional Edit column + button.
- `src/components/EditHeaderDialog.tsx` — new file (~120 lines).
- `src/hooks/useSapUpdate.ts` — new file (~90 lines, mirrors `useSapCreate`).
- `src/pages/DMRList.tsx` — discover update API + render the dialog.

### Expected result
On the SAP Gate Entries tab, every row shows an **Edit** button. Clicking it opens a header form pre-filled with that row's data. Saving sends a PATCH to the dynamically-built URL `…/api/gate/headers/<that row's gate_id>`, and the table refreshes with the new values. The static `gate_id` in the API config no longer matters — it's just documentation.

