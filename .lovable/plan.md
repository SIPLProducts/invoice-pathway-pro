

## Plan: Fix `CX_SXML_PARSE_ERROR` on Submit + 3-column Header layout + required fields

### Part A — Why SAP returns "Error while parsing an XML stream"

Postman works with the **exact same JSON payload**, so the payload shape is correct. The failure happens because the middleware's request to SAP is not arriving as `application/json`. Two real bugs in `middleware/src/sapClient.js`:

1. **`Content-Type` is set inside `extraHeaders` but Axios's per-request header merge can drop/override it** when combined with the instance `baseHeaders`. SAP then defaults to parsing the body as XML → `CX_SXML_PARSE_ERROR`.
2. When forwarding browser cookies, `cfg.auth = null` is set, but the Axios instance still has the Basic-auth `Authorization` header baked in. Need to explicitly remove it for the cookie path.

Postman doesn't hit this because it explicitly sets `Content-Type: application/json` on the wire, and uses only one auth source.

### Part B — Fixes

**`middleware/src/sapClient.js`**
- In `sapWrite`, **stringify the body ourselves** and pass `transformRequest: [(d) => d]` so Axios cannot re-serialize. Force these headers on the wire (capitalised, top-level, not inside `extraHeaders`):
  ```
  Content-Type: application/json
  Accept: application/json
  ```
- In `buildRequestConfig`, when `extraCookies` are present, also set `cfg.headers.Authorization = undefined` so the instance Basic-auth header is dropped (not just `cfg.auth = null`).
- Keep CSRF/`If-Match: *` logic unchanged.

**`middleware/src/routes/gate.js`** (POST `/headers`)
- Log `sapBody.error.details` on `sap_error` so future SAP-side rejections show the offending field name in the server console.

**Frontend payload sanitisation — `src/hooks/useSapCreate.ts`**
- Add `sanitizeForSap(body, headerFields, itemFields)`:
  - Drop keys whose value is `""`, `null`, or `undefined` (SAP rejects empty strings on numeric/date/time properties).
  - For `type: "number"`, coerce to `Number`; drop if `NaN`.
  - For `type: "time"`, pad `HH:MM` → `HH:MM:SS`.
  - Recurse into the items array using `itemFields`.
- Accept optional `headerFields`/`itemFields` parameters in `submit(...)` so the hook can sanitise by type.

**`src/pages/DMRNew.tsx`**
- Build body using the configurable child key:
  ```
  const childKey = api.childKey ?? "_Item";
  const body: Record<string, unknown> = { ...header };
  if (itemFields.length) body[childKey] = items;
  ```
- Pass `headerFields` and `itemFields` to `submit(body, { headerFields, itemFields })` so the hook can sanitise.

### Part C — UI: 3-column Header + required fields

**`src/pages/DMRNew.tsx`**
- Change `Grid` from `md:grid-cols-2` to `md:grid-cols-2 lg:grid-cols-3` (matches the 932px viewport on lg breakpoints).

**`src/lib/sapApisStore.ts`**
- Bump `STORAGE_KEY` from `dmr.sapApis.v2` → `dmr.sapApis.v3` so cached defaults are re-seeded once for existing users.
- In `GATE_HEADER_REQUEST`, mark these as `required: true`:
  - `gate_id`, `plant`, `gate_date`, `gate_time`, `purpose`, `vendor`, `vehicle_no`, `transport_type`, `document_type`, `entry_type`, `gate_status`
- In `GATE_ITEM_REQUEST`, mark `quantity` and `unit` as `required: true` (already required: `item_no`, `material`).

The form already renders `*` next to required labels and validates them in `onSubmit` — no extra logic.

### Part D — Better error UX

**`src/components/SapLiveTable.tsx`** (and toast in `DMRNew.tsx`)
- When error code is `sap_error` and `sapBody.error.code === "CX_SXML_PARSE_ERROR"`, surface `sapBody.error.details[0].message` if present, so the user sees *which* field SAP rejected instead of "Error while parsing an XML stream".

### Files to change

- `middleware/src/sapClient.js` — force JSON Content-Type on the wire, drop instance Basic-auth header when cookies present
- `middleware/src/routes/gate.js` — log SAP error details
- `src/hooks/useSapCreate.ts` — payload sanitisation by field type
- `src/pages/DMRNew.tsx` — 3-column grid; pass field metadata to `submit`; use `api.childKey`
- `src/lib/sapApisStore.ts` — bump storage key; mark required fields
- `src/components/SapLiveTable.tsx` — show SAP `details[0].message` for XML parse errors

### Expected result

- `Submit to SAP` posts **identical** wire format to Postman (`Content-Type: application/json` + the same JSON body) → SAP no longer throws `CX_SXML_PARSE_ERROR`.
- Header form renders in 3 columns on desktop with `*` markers on required fields.
- Empty optional date/time/number fields are stripped before sending, avoiding spurious SAP rejections.
- If SAP still rejects something, the toast/banner shows the exact field SAP complained about.

