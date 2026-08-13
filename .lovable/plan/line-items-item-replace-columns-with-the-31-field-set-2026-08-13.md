# Line Items (_Item) — replace columns with the 31-field set

Replace the current 14 line-item fields with the exact 31 columns you listed, in the given order. Table layout, styling, editing behaviour, add/remove-line buttons and the amount calculations stay untouched; only the field definitions change.

## New column order

Company Code, Profit Center / Plant, PO Number, PO Date, MOVEMENT TYPE, HSN Code, Materials Code, Materials Description, Storage Location, UOM, PO Quantity, Goods Receipt Quantity, Invoice Quantity, Invoice Value, Currency, WBS ELEMENT, Supplier Batch, DATE OF MANUF., Material Doc. Year, Expiry Date, WARRANTY, BATCH NO, Purchase Requestion Number, Purchase Requestion Date, Requirements date, Entry Date & Time, Debit/Credit indicator, GRN Status, Receipt Delay Reason, Shortage/Brekages, Remarks.

## Technical details

- `src/lib/sapApisStore.ts`
  - Rewrite `GATE_ITEM_REQUEST` with the 31 fields, keyed in snake_case (e.g. `company_code`, `profit_center_plant`, `po_date`, `movement_type`, `hsn_code`, `materials_code`, ... `shortage_breakages`, `remarks`), with `showInForm: true` and sensible types: dates for PO Date / DATE OF MANUF. / Expiry Date / Purchase Requestion Date / Requirements date, number + right alignment for PO Quantity, Goods Receipt Quantity, Invoice Quantity, Invoice Value, everything else string.
  - Add a `GATE_ITEM_FIELDS_VERSION` flag and a one-time refresh block in `bootstrapCloud` (mirroring the existing header-field refresh) so gate configs already saved in the backend pick up the new item fields instead of showing the old ones.
- No changes to `src/pages/DMRNew.tsx`: it already renders `itemFields` in order inside an `overflow-x-auto` wrapper, so the wide table scrolls horizontally with headers aligned to their inputs.

## Note

The line-item total currently sums `quantity × rate` / `amount`. Those keys no longer exist in the new set, so "Total Invoice Value" would read 0. I will map the total to the new `Invoice Value` column (summing it) so the amount panel keeps working — no visual change.
