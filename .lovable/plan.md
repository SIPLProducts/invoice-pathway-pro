# Create DMR: remove PO Line Items table, widen Line Item boxes

1. Remove the read-only "PO Line Items" table under Purchase Order Details. Pressing Enter on a PO Number still fills Line Items (_Item); the loading and error messages stay.
2. Line Items (_Item): give every column a minimum width so the full value shows (about 160px for text, 120px for numbers, 140px for dates; wider, about 260px, for description fields like MaterialDesc). The headers stay on one line. The table scrolls sideways when needed.

## Technical
- `src/pages/DMRNew.tsx`: delete the `poLookup.lines.length > 0` table block (and `PO_LINE_FIELDS` if unused).
- Item `<td>`/`<th>`: add a min-width based on `f.type`/key (`/desc|name|text/i` → wide), plus `whitespace-nowrap` on the headers.
