# Make the SAP payload fields required on Create DMR

## What changes
1. **Required header fields (marked with \*):** Plant, GateDate, GateTime, Vendor, VendorName, VehicleNo, DriverName, EntryType.
2. **Required line item fields (marked with \*):** Material, MaterialDesc, OpenQty, Plant, PoItem, PoNumber, Quantity, StorageLocation, Unit.
3. **Submit to SAP checks them.** If one is empty, you see a message such as "Vehicle No is required" or "Line 1: PO Item is required", and nothing is sent.
4. **Same switch as before.** The "Required" switch in SAP API Settings for Create DMR is turned on for these fields, so you can change them later without code.

Note: your sample sends StorageLocation as empty. Once it's required, it must be filled before submitting. If SAP accepts it blank, I can leave it optional instead.

## Technical details
- Update the "Create DMR" row in `sap_api_configs`: set `required: true` on those 8 header keys and 9 item keys.
- `DMRNew.tsx`: in `onSubmit`, also validate `itemFields` with `required` on every row (empty string or undefined fails, 0 allowed). Show `*` on required item column headers in the Line Items table.
- Add a test: a missing required item field (PoItem) blocks the submit.
