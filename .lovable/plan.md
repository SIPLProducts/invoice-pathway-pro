# Fix "Nothing changed — no fields to send" on line item update

## Cause
You changed Description to "test", and the screen correctly picked it up as `MaterialDesc`. But the saved **Update DMR Item Based on Gate ID and ItemNo** API in SAP API Settings has the wrong request field list stored: it holds old GRN-style fields (Company Code, PO Date, Materials Description, HSN Code...) instead of the gate item fields (Material Desc, Quantity, Remarks...). The final cleanup step keeps only fields on that list, so `MaterialDesc` was dropped, and the new empty-payload check stopped the call. The header update can hit the same problem if its saved list is out of date.

## Fix
1. **Stop filtering by the saved field list.** The edit screens already send only the fields you actually changed, under SAP's exact names, so the extra filter isn't needed. The cleanup will still remove key fields (GateId, ItemNo), system fields (LastChangedAt, SAP__Messages, @odata...) and convert numbers/times. This works for any service without depending on settings.
2. **Repair the saved settings.** Reset the stored request item fields on "Update DMR Item Based on Gate ID and ItemNo" (and the header fields on "Update DMR Based on Gate ID") to the correct gate field lists, both in the database and on load for any stale copies.
3. Tests: an item body `{MaterialDesc: "test"}` comes through even when the saved field list doesn't contain it; key/system fields are still removed.

## Technical
- `src/hooks/useSapItemUpdate.ts` `sanitizeItemRow`, `src/hooks/useSapUpdate.ts` `sanitizeRow`: remove the `allowed` check; add a skip list for keys (gateid, itemno) and system fields; type lookup stays normalized.
- `src/lib/sapApisStore.ts`: version-flagged one-time refresh setting `requestItemFields`/`responseItemFields` = gate item seed for the item update API, and the header seed for the header update API.
- Database: update those two rows in `sap_api_configs`.
- Publish afterwards for dmr2grn.siplproducts.com.
