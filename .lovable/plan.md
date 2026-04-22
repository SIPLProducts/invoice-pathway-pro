

## Plan: 3-column Header layout, required-field marking, and fix SAP "XML parse error" on Submit

### Part 1 — UI: New DMR header in 3 columns + required fields

**File: `src/pages/DMRNew.tsx`**
- Change `Grid` from `md:grid-cols-2` to `md:grid-cols-2 lg:grid-cols-3` so the Header section uses 3 columns on desktop (matches the screenshot width).

**File: `src/lib/sapApisStore.ts`**
- In `GATE_HEADER_REQUEST`, mark these as `required: true`:
  - `gate_id`, `plant`, `gate_date`, `gate_time`, `purpose`, `vendor`, `vehicle_no`, `transport_type`, `document_type`, `entry_type`, `gate_status`
- In `GATE_ITEM_REQUEST`, keep `item_no`, `material` required and add `quantity`, `unit` as required.
- Note: existing seeded APIs in `localStorage` already cached old defaults. To make new required flags actually take effect for existing users, bump `STORAGE_KEY` from `dmr.sapApis.v2` to `dmr.sapApis.v3` so the seed re-applies once.

The form already shows `*` after the label when `f.required`, and `onSubmit` already validates required fields — no logic change needed beyond the field flags.

### Part 2 — Fix `CX_SXML_PARSE_ERROR` on Submit to SAP

**Root cause:** SAP OData v4 (ABAP RAP) accepts JSON, but internally re-serializes to XML for backend processing. It throws `CX_SXML_PARSE_ERROR` when the JSON payload contains:
1. Empty strings `""` where SAP expects a number, date, or time (e.g. `gross_weight: ""`, `gate_time: ""`).
2. Unknown property names not defined in the OData entity.
3. Wrong navigation property name for line items. The expand uses `_Item`, but the **create** payload often must use the same nav name; some services actually require `to_Item`. Currently we send `_Item: [...]`.
4. Date/time strings not in the SAP-expected ISO shape (e.g. `gate_time` must be `HH:MM:SS`, not `HH:MM`).

**File: `src/hooks/useSapCreate.ts`** — sanitize the payload before POST:
- Add `sanitizeForSap(body, headerFields, itemFields)` that:
  - Drops keys whose value is `""`, `null`, or `undefined` (so SAP uses its own defaults instead of choking on empty primitives).
  - For `type: "number"` fields, sends the value as a JS number (already done) and drops if `NaN`.
  - For `type: "time"` fields, pads `HH:MM` → `HH:MM:SS`.
  - For `type: "date"` fields, ensures `YYYY-MM-DD` (HTML date input already gives this).
  - Recursively sanitizes each `_Item` row.
- Keep the navigation property name configurable via `api.childKey` (defaults to `_Item`). Pass it through from `DMRNew.tsx`:
  - In `DMRNew.tsx onSubmit`, build body using `api.childKey ?? "_Item"` instead of hardcoded `_Item`, and pass `headerFields`/`itemFields` to `submit` so the hook can sanitize by type.

**File: `src/pages/DMRNew.tsx`**
- Change the body construction:
  ```
  const childKey = api.childKey ?? "_Item";
  const body = { ...header };
  if (itemFields.length) body[childKey] = items;
  ```
- Update `submit` call to pass field metadata so the hook can sanitize correctly.

**File: `src/components/SapLiveTable.tsx`** (small):
- When the error code is `sap_error` and `sapBody.error.code === "CX_SXML_PARSE_ERROR"`, surface the SAP `details[0].message` if present so the user sees *which* field SAP rejected, instead of just "Error while parsing an XML stream".

**File: `middleware/src/routes/gate.js`** (small):
- In the POST `/headers` handler, on `sap_error` from `sapWrite`, log `sapBody.error.details` to the server console so you can see which OData property SAP complained about. No behavior change for the client.

### What stays the same
- Middleware auth path and cookie forwarding — unchanged.
- Items popup, table rendering, OCR card — unchanged.
- The 3-column layout only applies at `lg` breakpoint and above; mobile/tablet stay 1–2 columns.

### Expected result
- Header form renders in 3 columns on desktop with `*` markers on the required fields (`gate_id`, `plant`, `gate_date`, `gate_time`, `purpose`, plus the rest above).
- Submitting with empty optional numeric/time fields no longer triggers `CX_SXML_PARSE_ERROR` because those keys are stripped before sending.
- If SAP still rejects something specific, the toast/banner now shows the precise field name from `sapBody.error.details`.

### Caveat
If after the fix SAP still returns `CX_SXML_PARSE_ERROR`, the most likely remaining cause is the items navigation property name (`_Item` vs `to_Item`). We expose it via `api.childKey` so you can change it in SAP Settings → Create_Gate_Service without a code change.

