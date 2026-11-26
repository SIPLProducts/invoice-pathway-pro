# Post Mat Doc Against DMR + popup messages

## What you will get
1. **New API in SAP API Settings: "Post Mat Doc Against DMR"**
   - POST `.../zsd_gate_entry/0001/GateHeader('{gate_id}')/com.sap.gateway.srvd_a2x.zsd_gate_entry.v0001.postGoodsReceipt`
   - Scripts tab: CSRF token fetched before the request (same as Create/Update). Basic Auth user/password stay in the middleware, never in the browser.
   - Request fields: PostingDate, StorageLocations, Serials. Response fields: GateId, MaterialDoc, MaterialDocYear, PostingDate, CancelRefDoc, CancelRefYear.
2. **Create GRN Post button**
   - Disabled until a Gate ID is selected; then enabled and ready.
   - Sends: PostingDate from the Posting Date field (YYYY-MM-DD), StorageLocations from the item Storage Loc (first line, e.g. ST00), Serials built as `ItemNo:Serial` from lines that have a serial (e.g. `10:SN0000101`, multiple joined by commas); empty values are left out.
   - A "Confirm post?" popup before sending, then a loading state.
3. **Big centered popup messages (SweetAlert style) everywhere**
   - Success popup: "Material Document 5000001659 / 2026 posted for Gate 2007260031".
   - Error popup with the exact SAP message.
   - Same popup used for Create DMR, Update DMR header, Update DMR line item and Create GRN post (replacing the small corner toasts for these results).

## Technical details
- Add `sweetalert2`; small helper `src/lib/alerts.ts` (`alertSuccess`, `alertError`, `confirmAction`) themed with project tokens.
- Seed in `src/lib/sapApisStore.ts`; resolve via `useGateApis` (pickSameService); call through the existing proxy write path with `x-sap-path` and CSRF flag; `{gate_id}` substituted positionally.
- Parse `value[0]` of the response for MaterialDoc.
- Wire alerts into `DMRNew.tsx`, `EditHeaderDialog.tsx`, `EditableItemsTable.tsx`, `GRNCreate.tsx`.
- No real SAP post is run during testing (it would create a real material document).
- Note: the pasted script contains the SAP password — it should be changed in SAP.
