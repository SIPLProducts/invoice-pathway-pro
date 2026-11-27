# Search box on All DMR table

## What you'll see
- A search box above the All DMR table ("Search Gate ID, PO, vendor, vehicle...").
- As you type, the table shows only gate entries where any value matches — header fields (Gate ID, PO, Vendor, Vehicle No, Invoice, dates...) or any line item field (Material, Description, Batch...).
- Not case sensitive; partial text works (e.g. "4500" finds all POs starting with it).
- A count like "3 of 25" and a clear (X) button. Empty search shows everything, newest first as now.
- Selecting/expanding rows and Excel export work on the filtered list.

## Technical details
- `src/components/SapLiveTable.tsx`: add `query` state + Input with Search icon in the toolbar; filter the sorted `rows` memo by stringifying every header value and every child row (`schema.childKey`) value, lowercase `includes`.
- Clear selection if the selected row is filtered out.
- Small unit test for the filter helper (matches PO in header, material in item, case-insensitive).
