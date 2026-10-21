# Bring back the header fields and add PoItem to Line Items

## Why fields disappeared
Submit to SAP now uses your **Create DMR** API. That API has only 8 header fields saved (Plant, GateDate, GateTime, Vendor, VendorName, VehicleNo, DriverName, EntryType). The form shows only the fields saved on the API, so the other header fields went missing. Its Line Items still have the old 34 fields, and none of them is PoItem.

## What changes
1. **Header:** your 8 SAP fields stay at the top. The other header fields that were there before (DC/Invoice Number, tax amounts, etc.) come back below them, in the same order as before.
2. **Line Items:** your payload fields are added at the front: Material, MaterialDesc, OpenQty, Plant, **PoItem**, PoNumber, Quantity, StorageLocation, Unit. The existing line item columns stay after them.
3. **What goes to SAP stays the same as your sample payload.** Only your payload fields are sent. The restored fields show on screen but aren't sent, so SAP won't reject the entry for fields it doesn't know.
4. Each field gets a **"Send to SAP"** switch in SAP API Settings, so you can choose later which fields are sent, without any code change.

## Technical details
- `FieldDef`: add optional `sendToSap?: boolean` (default true). Add the toggle in `FieldsEditor`.
- One-time update of the "Create DMR" config in `sap_api_configs`:
  - `requestHeaderFields` = the 8 current fields, then the standard gate header list (`DEFAULT` gate header fields) minus duplicates, with `sendToSap:false`.
  - `requestItemFields` = the 9 payload fields (OpenQty/Quantity as number), then the existing 34 with `sendToSap:false`.
- `DMRNew.onSubmit` and `sanitizeRow`: skip fields where `sendToSap === false`.
- Update the payload test: fields with `sendToSap:false` are not sent, and PoItem is sent.
