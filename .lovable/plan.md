# Plant mismatch, Quantity in All DMR, and middleware payload logs

## What we found
- **Plant 1600 → 2012:** when you press Enter on the PO Number, each line item takes its Plant from the PO (2012). The header Plant is only filled from the PO when it's empty. If Plant was typed after the PO lookup or left blank first, 2012 wins. SAP may also set the header Plant from the items. The new logs will show which one is happening.
- **Quantity not in All DMR:** Quantity belongs to the line items, not the header. The All DMR table lists one row per entry (header only), so Quantity appears only in the line items popup.

## Changes
1. **Plant follows what you type:** whatever Plant you type in the header is copied into every line item, both when the PO fills the items and when you change Plant later. A PO lookup never overwrites a Plant you've already typed.
2. **Quantity in All DMR:** add a "Total Quantity" column to the table (the sum of the line item quantities). It's also included in the Excel download.
3. **Middleware logs for every SAP call (GET/POST/PATCH/DELETE/batch, including PO lookup and Create DMR):** prints the time, method, full SAP path, the request payload, the HTTP status, and the response body (shortened past about 4,000 characters). Turn it off with `SAP_PAYLOAD_LOG=0` in `middleware/.env`. Passwords and cookies are never printed.

## Technical details
- `src/pages/DMRNew.tsx`: in the PO-lines effect, override the item `Plant` with header Plant when it's set; a header Plant change syncs to the items' Plant. In `onSubmit`, items inherit header Plant if it's set.
- `src/components/SapLiveTable.tsx`: derived column `__totalQty` = sum of `Quantity` across child rows (key matched case-insensitively); passed to the export columns.
- `middleware/src/util/sessionLog.js`: add `logSapPayload({method,path,body})` and `logSapResponse({method,path,status,data})`; call them from `sapGet`, `sapWrite` and `sapBatch` in `sapClient.js`.
- Test: header Plant overrides PO line Plant when mapping.
