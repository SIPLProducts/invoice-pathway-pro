# Update DMR: fill edit form and allow line-item editing

## Why the fields are empty
SAP sends field names like `VehicleNo`, `DriverName`, while the edit form looks for `vehicle_no`, `driver_name`. The edit popup reads names exactly, so every box comes up blank. (The view card already handles this, which is why it shows values.)

## What will change
1. **Edit header popup fills in** — every box shows the current SAP value (Plant, Date, Time, Vendor, Vehicle, Driver, etc.). On save, changed values go back to SAP under SAP's own field names (e.g. `VehicleNo`), so the update matches what SAP expects.
2. **Line items editable on Update DMR** — each line in the "Line items" table gets a pencil button. Click it, the row turns into input boxes pre-filled with current values (Quantity, Storage Location, etc.), then Save sends just that line to SAP via the Update Item API in SAP Settings; Cancel restores it. After saving, the DMR reloads.
3. If no Update Item API is set up, the pencil is hidden and a short note links to SAP Settings.
4. Same fix applies to the item edit in All DMR's items popup.

## Technical details
- `src/components/EditHeaderDialog.tsx`: read values with `getPath(row, f.key)`; build body using the matching actual row key (exact, then case/underscore-normalized) so PATCH payload uses SAP PascalCase names.
- `src/components/EditableItemsTable.tsx`: same `getPath` reads for display/draft, and map draft keys back to real SAP keys on save.
- `src/pages/DMRUpdate.tsx`: replace read-only items table with `EditableItemsTable` using `itemUpdateApi` from `useGateApis`; `onSaved` → `proxy.refresh()`.
- Add tests: header dialog initial values from a PascalCase row; key mapping helper returns `VehicleNo` for `vehicle_no`.
- Real SAP PATCH not executed in testing (would change live records).
