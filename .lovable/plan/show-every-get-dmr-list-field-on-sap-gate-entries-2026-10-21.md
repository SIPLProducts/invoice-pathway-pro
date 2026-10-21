# Show every Get DMR List field on SAP Gate Entries

## Goal
The SAP Gate Entries table shows every field that Get DMR List returns from SAP, not just the columns set up in SAP API Settings.

## What changes
- The table works out its columns from the data SAP actually sends back. Every field in each gate entry becomes a column.
- Fields set up in SAP API Settings appear first, using their saved labels and order. Any other fields SAP returns follow, with readable labels (for example `GateId` becomes "Gate Id").
- The expandable line items (`_Item`) also show every field SAP returns for each item.
- Technical SAP fields are left out (`@odata...`, `__metadata`, and nested navigation objects).
- The table scrolls sideways so all columns fit on screen. The first column and the Edit column stay pinned.
- Editing, line-item editing and Refresh work the same as now.

## Technical details
- `src/components/SapLiveTable.tsx`: after rows load, merge `schema.columns` with the union of scalar keys across the rows (no duplicates, case-insensitive match against `key`). Do the same for child item rows. Ignore `showInTable: false` only for configured fields, so the user can still hide one on purpose.
- Helper `humanizeKey` (camelCase/snake_case to Title Case) in `src/lib/sapApiSchemas.ts`.
- Nothing SAP-specific is hardcoded. Columns come only from the response and the API settings.
