# Create GRN dropdown + All DMR sorting and duplicate columns

## 1. Create GRN action dropdown
Replace the options with:
- A01 Goods Receipt
- A02 Change
- A03 Display
- A04 Cancel

(Codes shown with each name; A01 stays the default.)

## 2. All DMR (Get DMR List)
- **Newest first:** sort rows by Gate Date + Gate Time descending (fallback: Gate ID descending) after loading from SAP.
- **Remove duplicate columns:** SAP sends `VehicleNo`, the setting has `vehicle_no`, so both "Vehicle" and "VehicleNo" appear. When adding extra columns from SAP data, skip any SAP field that matches a configured column ignoring case and underscores. Same for line-item columns.

## Technical details
- `src/pages/GRNCreate.tsx`: option list.
- `src/components/SapLiveTable.tsx` / `mergeColumnsWithData`: normalized-key dedupe; sort rows by date/time desc.
- Add a test: PascalCase row + snake_case config gives no duplicate column; rows sorted newest first.
