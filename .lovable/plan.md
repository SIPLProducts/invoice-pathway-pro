# Plan: Add Purchase Order Details box to DMR New screen

## Goal
Insert a new "Purchase Order Details" section on the `New DMR Entry` screen, placed directly between the existing `ZUI_Gate_Service — Header` card and the `Line Items (_Item)` section. The new section must contain exactly two fields — **PO Number** (left) and **OBD** (right) — in a single horizontal row, using the same input styling as the rest of the screen.

## What will change
- `src/pages/DMRNew.tsx` only.
- No changes to `src/lib/sapApisStore.ts`, the configured header field list, the amount-summary panel, the line-items table, navigation, buttons, or page styling.

## Implementation details

1. **State keys for the new fields**
   - Use header-state keys `po_number` and `obd_number`.
   - These keys are added to the existing `header` object, so they are automatically included in the SAP submit body (`{ ...header }`) without changing the submission logic.

2. **Default values**
   - Initialise the `header` state with empty-string defaults for `po_number` and `obd_number`.
   - Preserve these defaults when the auto-derive effect replaces the header from the API response schema, so the fields never disappear.

3. **New field definitions (local only)**
   - Create two local `FieldDef` objects:
     - `PO Number` → key `po_number`, type `string`
     - `OBD` → key `obd_number`, type `string`
   - Render them with the existing `Field` + `FieldInput` components so the inputs inherit the identical height, border, border-radius, background, padding, font, and focus glow used elsewhere.

4. **Layout**
   - Add a new `Section` titled `Purchase Order Details`.
   - Inside, use the existing `Grid` (or an equivalent `grid-cols-2 gap-4`) so that:
     - PO Number label and input occupy the left column.
     - OBD label and input occupy the right column.
     - Labels sit on the same horizontal line; inputs sit directly below each label.
   - Place this `Section` immediately after the Header `Section` and before the conditional `Line Items (_Item)` `Section`.

5. **OCR merge compatibility**
   - The existing OCR merge already copies any extracted header key into `header`, so if OCR ever extracts `po_number` it will populate the new field without extra code.

## Validation
- Run the Vite build / typecheck to ensure no TypeScript errors.
- Open the preview on `/dmr/new` and confirm:
  - The new "Purchase Order Details" card appears between Header and Line Items.
  - PO Number is left, OBD is right.
  - Inputs match the styling of existing fields.
  - Existing header fields and line-item table are unchanged.
