

## Plan: Fix the missing Edit button + add per-section auto-detect for Item fields

### Issue 1 — "Edit" button not visible on DMR → SAP Gate Entries

**Root cause.** The Edit column only renders when `DMRList` finds an `updateApi`. Discovery requires **both**:
1. The API name/endpoint matches `update.*gate | gate.*update | update[ _-]?header`, AND
2. The API has `updateEndpoint` (the new template field, e.g. `/api/gate/headers/{gate_id}`) saved.

Your "Update Header Data" API matches condition 1 but the new `updateEndpoint` field is empty (you only filled the legacy *Endpoint Path* with the static `GateHeader(gate_id='A123I00005')`). With no template, the frontend has no way to substitute the row's `gate_id`, so the Edit column is correctly hidden.

Today the UI gives you no signal *why* it's hidden, and the discovery is too strict.

**Fixes:**

1. **`src/pages/DMRList.tsx` — broaden discovery + show a clear "configure me" banner.**
   - Discovery: pick any Active API whose `updateEndpoint` is set, OR whose name matches the update regex (so we can show a banner pointing the user to add the template). Order of preference: matched-name + template > template-only > matched-name.
   - Always render the Edit column when an `updateApi` exists (with `updateEndpoint`); when name matches but template is missing, render a **banner** above the table:
     > "Update API found ('Update Header Data') but the **Update Endpoint** template is empty. Open API Settings → Update Header Data → API Details and set Update Endpoint to `/api/gate/headers/{gate_id}` to enable per-row editing."  
     With a "Configure" link that deep-links to `/sap/settings/edit/Update%20Header%20Data#details`.

2. **`src/components/SapLiveTable.tsx` — already supports the Edit column.** No code change there.

3. **`src/lib/sapApisStore.ts` — auto-migrate existing "Update Header Data" entries.**
   - On `useSapApis` hydrate, if an API's name matches `/update.*header/i` and `updateEndpoint` is empty AND `endpoint` contains a `(key='value')` segment, auto-derive `updateEndpoint = "/api/gate/headers/{gate_id}"`, `updateMethod = "PATCH"`, `keyField = "gate_id"` (one-time migration, persisted). This makes the Edit button appear immediately for users who already saved the API before this field existed.

### Issue 2 — Per-section "Auto-detect from sample JSON" for Header & Item

**Root cause.** Today there's a single tab-level auto-detect button that expects a combined header + `_Item` payload. For the **Update API** there's typically no `_Item` array in the request/response, so the Item card stays empty and looks like the feature is missing. The user wants a dedicated paste button on each card (Header / Item) with examples scoped to that card.

**Fix:**

1. **`src/components/api-edit/FieldsEditor.tsx` — add an optional `onAutoDetect?: (sampleJson: string) => void` prop and a built-in paste UI.**
   - When `onAutoDetect` is provided, render an extra "Auto-detect from sample JSON" button next to "Add Field" in the card header.
   - Clicking it expands a small textarea + "Generate fields" / "Cancel" buttons inside the same card. Submission calls `onAutoDetect(text)`.

2. **`src/pages/SAPApiEdit.tsx` — wire four scoped handlers.**
   - **Request → Header** card: `onAutoDetect = (text) => detectFields(text, "request", "header")` — generates only `requestHeaderFields` from the pasted JSON's top-level scalar keys.
   - **Request → Item** card: `onAutoDetect = (text) => detectFields(text, "request", "item")` — accepts either an array `[ { … } ]`, a single item object `{ … }`, or `{ _Item: [ … ] }` and generates only `requestItemFields`.
   - **Response → Header** card: same pattern → `responseHeaderFields`.
   - **Response → Item** card: same pattern → `responseItemFields`.
   - Each handler reuses the existing `inferType` / `prettify` helpers and toasts success/failure with what was imported.
   - Keep the existing tab-level "Auto-detect from sample JSON" button (it stays useful for pasting a full combined payload), but the new per-section buttons mean the user no longer needs combined input.

### What stays the same
- Middleware: zero changes.
- `useSapUpdate`, `EditHeaderDialog`, session handling: untouched.
- Existing tab-level auto-detect: kept for backward compatibility.
- All other API Settings tabs: untouched.

### Files to change
- `src/pages/DMRList.tsx` — relax `updateApi` discovery + add "configure me" banner.
- `src/lib/sapApisStore.ts` — one-time migration to populate `updateEndpoint`/`updateMethod`/`keyField` on existing "Update Header" APIs.
- `src/components/api-edit/FieldsEditor.tsx` — add optional `onAutoDetect` prop + inline paste UI.
- `src/pages/SAPApiEdit.tsx` — pass four scoped `onAutoDetect` handlers (one per FieldsEditor instance).

### Expected result
1. Open DMR → SAP Gate Entries: every row shows an **Edit** button (existing "Update Header Data" API auto-migrates to a working `{gate_id}` template). If for some reason migration didn't apply, a clear amber banner explains exactly which field to fill and links to the right settings page.
2. Open API Settings → any API → Request Fields or Response Fields tabs: each of the four cards (Header / Item × Request / Response) has its own **Auto-detect from sample JSON** button that pops a paste box and generates only that section's fields. Pasting the request payload you provided into the *Request — Header Fields* card immediately produces all the header inputs.

