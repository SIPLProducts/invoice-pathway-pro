# New DMR Entry: buttons in one row, Plant as a text box, no duplicate fields

## What changes
1. **Save Draft and Submit to SAP** always sit side by side in one row at the top right. They no longer wrap onto separate lines on smaller screens.
2. **Plant** becomes a normal text box you type into. The dropdown is removed.
3. **Duplicate fields removed.** Each field appears only once on the form:
   - Within the header and within Line Items, a field that appears twice (for example "Gate Id" and "gate_id", or "PoNumber" and "po_number") is shown once.
   - A field that appears in both the header and Line Items stays in the header only. Plant is one example.
   - A field already shown in the Purchase Order Details box (PO Number, OBD) is not repeated in the header grid.
   - Values still go to SAP exactly as before. The header value is used for every line item where SAP needs it.

## Technical details
- `src/pages/DMRNew.tsx`:
  - PageHeader actions wrapped in `flex flex-nowrap gap-2 shrink-0`.
  - Remove the `plantOptions` `<select>` branch and always render the `FieldInput` for `plantField` as a text field.
  - Add `dedupeFields(fields, excludeNormKeys)`. It normalizes keys (lowercase, strip `_`/`-`/spaces) and labels, and keeps the first occurrence.
  - Apply it to `headerFields`, then to `itemFields`, excluding the normalized header keys.
  - Remove PO box keys from `gridFields`.
  - On submit, copy header values for removed item keys into each item, so the SAP payload stays the same.
- Nothing service-specific is hardcoded. Duplicates are detected from the configured fields.
