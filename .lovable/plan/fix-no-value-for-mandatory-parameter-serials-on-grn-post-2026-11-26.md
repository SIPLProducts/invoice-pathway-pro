# Fix "No value for mandatory parameter 'Serials'" on GRN Post

## Why it failed
Your middleware log shows the app sent:
`{"PostingDate":"2026-11-26","StorageLocations":"ST00"}`
SAP's postGoodsReceipt action requires **all three** parameters, including `Serials`. Because the Serial No. column was empty, the app left `Serials` out, and SAP rejected the whole post with error 400. The connection, login and security token all worked; only the payload was missing a field.

## Fix
- Always send all three fields: `PostingDate`, `StorageLocations` and `Serials`. If no serial numbers are entered, send `"Serials": ""`, which SAP accepts for materials without serial numbers.
- Before posting, check that Posting Date and Storage Location are filled in. If either is empty, show a popup ("Storage Location is required") instead of calling SAP.
- Update the test so it expects `Serials: ""` when no serials are entered.

## Technical details
- `src/lib/grnPostPayload.ts`: always include all three keys (empty string when blank).
- `src/pages/GRNCreate.tsx` `onPost`: run the required-field check before the confirm popup.
- `src/lib/grnPostPayload.test.ts`: update the expected result.

If SAP still rejects an empty `Serials` for serial-managed materials, the user enters serials per line in the Serial No. column (sent as `10:SN0000101`).
