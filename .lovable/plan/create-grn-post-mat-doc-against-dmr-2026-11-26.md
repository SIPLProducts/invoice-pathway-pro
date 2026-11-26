# Create GRN — Post Mat Doc Against DMR

## What changes on the screen
1. **Title** becomes "Create GRN — Post Mat Doc Against DMR".
2. **Top bar becomes a 4-column grid**: Action (A01–A04), Reference (R01/R02/R05), PO Number, Item, Plant, Gate ID, GR goods receipt (101). Narrow screens fall back to 2 columns, then 1.
3. **New Gate ID dropdown** next to "GR goods receipt":
   - Lists every Gate ID loaded on the All DMR screen, using the same Get DMR List call, newest first.
   - Starts on "Select Gate ID".
   - Shows a loading state, and a message if SAP can't be reached.
4. **When a Gate ID is chosen**, the DMR fills the screen:
   - Header: Plant, PO Number, Vendor / Supplier, Vendor Name, Delivery Note (Invoice/Reference), Header Text (Remarks), Document Date (Gate Date).
   - Items table: one line per DMR item. Material, Mat. Short Text, Qty, EUn, SLoc, Batch, Plant, Purchase Order, PO Item and Vendor are filled in. Movement type is 101.
   - The Reference dropdown and the PO Number, Item and PO search inputs are hidden, because the DMR provides them. Choosing "Select Gate ID" again shows them and clears the filled data.
5. Posting to SAP still isn't connected. Post shows the same "not connected yet" message.

## Technical details
- `src/pages/GRNCreate.tsx` only. Reuse `useGateApis().selectedApi`, `buildSchemaFromApi` and `useSapProxy` (the same pattern as DMRUpdate), plus `sortNewestFirst`.
- Read the fields with `getPath` (handles SAP PascalCase vs snake_case), with fallbacks such as `po_number`/`PoNumber` and `material_desc`/`MaterialDesc`.
- Items come from `schema.childKey` (`_Item`).
- Grid: `grid gap-3 sm:grid-cols-2 lg:grid-cols-4`, with a label above each control.

## Open assumption
"Dropdown and input hide" is read as hiding the Reference dropdown and the PO inputs once a Gate ID is picked. Say so if you meant a different set.
