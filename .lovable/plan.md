# All DMR: pagination, record count, Excel download, PDF per entry

## What changes
- **Record count**: the table header shows "Showing 1–25 of 132 entries" (or similar).
- **Pagination**: Previous/Next buttons, page numbers, and a "Rows per page" choice (10 / 25 / 50 / 100) under the table.
- **Download Excel** button at the top right of All DMR. It downloads every entry loaded from SAP, on every page, with every column. A second sheet holds all line items, each tagged with its Gate ID.
- **Row selection**: a checkbox on each row, plus "select all on this page".
- **Download PDF** button, enabled once at least one row is selected. Each selected entry becomes one invoice-style page:
  - Company logo at the top left, with the title "Gate Entry / DMR" and the Gate ID on the right
  - The entry's details shown in two columns (Plant, Vendor, Invoice/DC No, Date, PO, Vehicle, taxes, amounts…)
  - A line items table with every item field
  - The date it was generated, in the footer
  - One PDF file; selecting several rows gives several pages

## Technical details
- Add the `xlsx` (SheetJS) and `jspdf` + `jspdf-autotable` packages.
- `SapLiveTable.tsx`: add optional props `selectable`, `pageSize`, and an `onSelectionChange` callback. Pagination happens on screen, over the rows SAP has already returned. Selection is tracked by row key.
- New `src/lib/dmrExport.ts`:
  - `exportDmrExcel(rows, columns, childKey, childColumns)`
  - `exportDmrPdf(rows, columns, childColumns, logoUrl)`
  - Columns use the same merged set the table shows, so the export matches the screen.
- `SapGateEntries.tsx`: put the Download Excel and Download PDF (n) buttons in the PageHeader actions. It gets rows from the table through an `onRowsLoaded` callback.
- Logo: use the existing `src/assets/rithwik-logo.png` unless the user provides another one. It is drawn into the PDF as PNG.
- Downloads are built in the browser as files (Blob) and handed straight to the user.
