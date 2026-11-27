# Update "Post Mat Doc Against DMR" to postGoodsReceiptByPo

## What changes for the user
- Post on Create GRN calls SAP's new **postGoodsReceiptByPo** address. The Gate ID no longer goes in the address.
- SAP now gets the PO Number and PO Item along with the posting data:
```text
{
  "PoNumber": "410000777",
  "PoItem": "10",
  "PostingDate": "2026-11-26",
  "StorageLocations": "ST00",
  "Serials": "10:SN0000101"
}
```
- PO Number comes from the screen (filled in when a Gate ID is picked). PO Item comes from the selection box, or from the first line's PO item if that box is blank.
- Before calling SAP, if PO Number or PO Item is empty, a popup asks for it and that box is highlighted. The red Serial No. check stays as it is.
- The success popup works the same: "Material Document 5000001670 / 2026 posted for Gate 2007260031". It also shows the Service Entry Sheet when SAP returns one.
- Cancel GRN stays on the old cancelGoodsReceipt address with the Gate ID.

## Technical details
- `src/lib/sapApisStore.ts`: change the "Post Mat Doc Against DMR" seed endpoint to `/sap/opu/odata4/sap/zsb_gate_entry_o4/srvd_a2x/sap/zsd_gate_entry/0001/GateHeader/com.sap.gateway.srvd_a2x.zsd_gate_entry.v0001.postGoodsReceiptByPo`, keep CSRF on, update the description and sample request/response fields. Migrate the saved row on load (and update the database row) when it still points at the old `GateHeader('{gate_id}')/...postGoodsReceipt` address.
- `src/lib/grnPostPayload.ts`: `buildGrnPostPayload(postingDate, rows, { poNumber, poItem })` returns `PoNumber, PoItem, PostingDate, StorageLocations, Serials` in that order; PoItem falls back to the first row's PO item. Add `missingPoFields()`.
- `src/lib/grnPostPayload.test.ts`: test the exact Postman payload above and the PO item fallback.
- `src/hooks/useSapGrnPost.ts`: `fillSapPath` still runs (no placeholder left, so the path is unchanged); Gate ID is used only for the result message.
- `src/pages/GRNCreate.tsx`: pass the PO number/item, validate them, highlight missing boxes, show ServiceEntrySheet in the popup when not empty.
