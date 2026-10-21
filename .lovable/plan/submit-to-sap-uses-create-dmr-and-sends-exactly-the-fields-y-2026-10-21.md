# Submit to SAP uses "Create DMR" and sends exactly the fields you configured

## What changes
1. **Which API is called:** Submit to SAP uses the API named **Create DMR** from SAP API Settings. Its endpoint is posted to SAP as-is (through the middleware). Older names (Create_Gate_Service, any "gate" API) stay only as a fallback.
2. **Payload = your configured fields only.** The body is built from the Request Header and Request Item fields set on Create DMR, using the exact field names you entered (e.g. `Plant`, `GateDate`, `GateTime`, `Vendor`, `VendorName`, `VehicleNo`, `DriverName`, `EntryType`, and in `_Item`: `Material`, `MaterialDesc`, `OpenQty`, `Plant`, `PoItem`, `PoNumber`, `Quantity`, `StorageLocation`, `Unit`). Nothing extra is added (no hidden PO/OBD defaults, no other screen-only values).
3. **Values typed on screen are sent.** Numbers go as numbers (`OpenQty`, `Quantity`), time as `HH:MM:SS`, date as `YYYY-MM-DD`. Empty fields are sent as empty strings for text fields (so `StorageLocation: ""` matches your sample) and left out only for empty number/date/time fields, which SAP rejects as blank.
4. **No fields removed from the screen.** The duplicate-hiding added earlier is undone: every field configured on Create DMR shows on the form, including `Plant` and `PoNumber` inside Line Items. Plant stays a text box; buttons stay in one row.

## Technical details
- `src/pages/DMRNew.tsx`: API selection prefers `/^create[_ ]?dmr$/i`, then existing fallbacks. Remove `dedupeFields` usage and PO-box filtering for display; render `headerFieldsRaw` / `itemFieldsRaw`. In `onSubmit`, build header only from `headerFieldsRaw` keys and each item only from `itemFieldsRaw` keys (drop the header-to-item copy and `PO_DEFAULTS` keys not in the config).
- `src/hooks/useSapCreate.ts` `sanitizeRow`: keep only configured keys; keep empty strings for text-type fields; still drop empty number/date/time.
- POST target stays derived from the Create DMR endpoint (`x-sap-*` headers) — nothing service-specific hardcoded.
- Add a small test: the payload from the sample fields contains exactly those keys, with `OpenQty`/`Quantity` as numbers.
