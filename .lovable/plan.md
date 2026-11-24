# Update DMR screen + All DMR PDF confirmation

## 1. New "Update DMR" screen
- New menu item **Update DMR** directly below **Create DMR** (same DMR permission, edit right).
- Top of the page: **Gate ID** box + **Fetch** button (Enter key also works).
- Fetch uses the existing **Get DMR** API from SAP API Settings, filtered by that Gate ID, and fills in the same form as Create DMR: header (Plant, Gate Date/Time, Vendor, Vehicle, Driver, Entry Type) and the line items.
- If no record is found, a clear "Gate ID not found" message is shown; the form stays locked until a record is loaded.
- User edits the fields and clicks **Update in SAP**, which sends the change through the existing **Update Header Data** API (and **Update Selected Line Item Data** for changed lines), with the same CSRF/Scripts settings already configured per API.
- Success/failure is shown on screen and recorded in the Scheduler's Recent API Calls table.

## 2. All DMR screen
- Hide the radio-button column.
- Clicking a row opens a confirmation popup: **"Do you want to download the PDF?"** with **Yes, download** / **Cancel**.
- Only on Yes is the PDF created and downloaded (same PDF as today). Cancel does nothing.

## Technical details
- Route `/dmr/update`, new page `src/pages/DMRUpdate.tsx`, reusing the field layout/mapping from `DMRNew.tsx` (shared pieces extracted rather than copied) and `getPath` for PascalCase SAP fields.
- Fetch: Get DMR API endpoint with `$filter=GateId eq '<id>'&$expand=_Item` via `useSapProxy`'s target headers; no service paths hardcoded.
- Popup uses the app's existing themed confirm dialog (same look as the rest of the app) instead of adding the SweetAlert library.
- `SapLiveTable` keeps `selectable` support but All DMR stops passing it; row click sets a pending row and opens the dialog.
- Real SAP update write is not tested by me (it would change a live record); you'll test it with a real Gate ID.
