# Fix "PATCH request with empty payload is not supported" (header + item update)

## Cause
The edit screens correctly build the changed fields under SAP's own names (e.g. `VendorName`, `VehicleNo`, `Remarks`). But just before sending, a cleanup step keeps only fields whose name exactly matches the configured field list, which uses lowercase names (`vendor_name`, `vehicle_no`). Every field gets dropped, so an empty body `{}` reaches SAP and SAP rejects it. This affects both Update DMR header and line item updates (and the All DMR popups).

## Fix
- In the header and item cleanup steps, match field names ignoring case and underscores (`VendorName` = `vendor_name`), and keep sending the SAP name as-is.
- Look up the field type and the live value the same way, so numbers/times are still converted correctly.
- Safety guard: if the cleaned body is empty, show "Nothing changed" and don't call SAP.
- Add tests: header body `{VendorName, VehicleNo}` and item body `{Remarks, MaterialDesc}` survive cleanup unchanged.

## Technical
- `src/hooks/useSapUpdate.ts` (`sanitizeRow`) and `src/hooks/useSapItemUpdate.ts` (`sanitizeItemRow`): normalized-key allow list and type lookup.
- No middleware change needed — it forwards the body as received.
- Needs publishing for dmr2grn.siplproducts.com.
