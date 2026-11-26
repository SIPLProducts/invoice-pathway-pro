# Update DMR Item API + show all header/item fields

## What changes
1. **New API "Update DMR Item Based on Gate ID and ItemNo"** (PATCH)
   - Address: `.../zsd_gate_entry/0001/GateItem(GateId='{gate_id}',ItemNo='{item_no}')`
   - CSRF fetch before request on, Basic Auth from middleware (same as header update).
   - Replaces any older item-update seed so Update DMR and All DMR use it automatically.
2. **Send only changed item fields** — reuse the header diff logic: e.g. editing Remarks and Material Desc sends only `{"Remarks": "...", "MaterialDesc": "..."}`. GateId/ItemNo go only in the address, never in the body. Save disabled when nothing changed, with a "Will send" preview.
3. **Show every field in tables and cards**
   - Item fields: GateId, ItemNo, Material, MaterialDesc, Quantity, Unit, OpenQty, Plant, Batch, StorageLocation, PoNumber, PoItem, DeliveryNo, DeliveryItem, InvoiceNo, Weight, Remarks, LastChangedAt.
   - Header fields: every field returned by GateHeader (except technical `@odata...` and `SAP__Messages`).
   - Applied to All DMR table + expanded line items, Update DMR header card and items table, and the edit dialogs. Duplicate columns stay merged; key and LastChangedAt fields are read-only.

## Technical
- `src/lib/sapApisStore.ts`: seed item update API (positional keys, csrf), retire old item update rows.
- `src/components/EditableItemsTable.tsx`: use `buildChangedPayload` per row, map keys via `resolveKey`, exclude GateId/ItemNo.
- `src/lib/sapApiSchemas.ts`: extend gate header/item schemas with full field lists; filter `@odata.*` and `SAP__Messages` in `mergeColumnsWithData`.
- Add test: item payload contains only changed fields and no keys.
- Real SAP PATCH not run automatically (would change a live DMR).
