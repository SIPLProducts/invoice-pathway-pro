# Fix "PATCH request with empty payload is not supported" (header + item) + middleware logs

## Cause
The edit screens build the changed fields under SAP's own names (e.g. `VendorName`, `VehicleNo`, `Remarks`), which matches your header and item responses. But just before sending, a cleanup step keeps only fields whose names exactly match the configured field list, which uses lowercase names (`vendor_name`, `vehicle_no`). So every field gets dropped and SAP receives an empty `{}`. This hits both the header and the line item updates on Update DMR and All DMR.

## Fix
- The header and item cleanup steps will match field names ignoring case and underscores (`VendorName` = `vendor_name`) and keep sending the SAP name as-is.
- Field type and live value are looked up the same way, so numbers and times still convert correctly.
- Safety check: if the cleaned body is empty, show "Nothing changed" and don't call SAP.
- Tests: the header body `{VendorName, VehicleNo}` and the item body `{Remarks, MaterialDesc}` come through cleanup unchanged.

## Middleware console logs (for your checking)
For every create/update call to SAP, the middleware terminal will print:
- `[SAP WRITE] PATCH <SAP path>` plus the exact JSON payload sent
- `[SAP WRITE] <status>` plus the SAP response body (or the SAP error body)
- Passwords, the CSRF token, cookies and the proxy secret are never printed.

## Technical
- `src/hooks/useSapUpdate.ts` (`sanitizeRow`), `src/hooks/useSapItemUpdate.ts` (`sanitizeItemRow`): normalized-key allow list and type lookup; empty-body guard.
- `middleware/src/sapClient.js` `sapWrite`: log the method, path, payload and the response or error.
- Restart the local middleware to get the logs, and publish to fix dmr2grn.siplproducts.com.
