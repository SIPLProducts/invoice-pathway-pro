# Require Serial No. on every line before posting a GRN

## What changes
- When you press **Post** (A01 Goods Receipt), the app checks every line in the Items table.
- If any line has no **Serial No.**, nothing is sent to SAP. Instead:
  - the empty Serial No. boxes get a red border and a light red background,
  - the table scrolls to the first empty one and puts the cursor in it,
  - a popup says which lines are missing, e.g. "Enter Serial No. for item 10, 20".
- The red highlight disappears as soon as you type in that box. Then press Post again.
- When all lines are filled, the app sends each line as item:serial, for example
  `"Serials": "10:SN0000101,20:SN0000102"`, together with Posting Date and Storage Location.
- Cancel (A04) is unchanged — it sends nothing.

## Technical details
- `src/lib/grnPostPayload.ts`: add `missingSerialRows(rows)` returning indexes of rows with an item number but blank serial; `Serials` built from all rows (comma-joined `item:serial`).
- `src/pages/GRNCreate.tsx`: in `onPost`, before confirm, compute missing rows; if any, store them in a `missingSerials` state set, alertError listing item numbers, focus first input (ref/data attribute). Serial cell input gets `border-destructive bg-destructive/10` when its row is in the set; `setCell` for `serial` removes the row from the set. Clear set on reset/Gate ID change.
- Update `src/lib/grnPostPayload.test.ts`: missing-serial detection and the exact `"10:SN0000101"` payload.
