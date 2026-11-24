# Create GRN — Item Detail panel

Add a panel below the items table on the Create GRN screen, matching the SAP "item detail" screenshots. It shows the details of the selected line and stays in sync with the table (edits in either place update the same line).

## Tabs
- **Material:** Material name + number, Supplier Mat. No., Material Group (read-only), EAN in Order Unit, EAN Check.
- **Quantity:** Qty in Unit of Entry + unit (editable), Qty in SKU (read-only), Qty in Delivery Note + unit, Quantity Ordered (read-only), No. Containers + unit.
- **Where:** Movement Type 101 "+ GR goods receipt", Stock type dropdown (Unrestricted-Use / Quality Inspection / Blocked), Plant name + code, Storage Location name + code, Goods Recipient, Unloading Point, Text.
- **Purchase Order Data:** Purchase Order + item (read-only), Item Category, "Del.Completed" Ind. dropdown, Del. Compl. Ind. PO Item checkbox (disabled).
- **Partner:** Vendor name + number (read-only).
- **Account Assignment:** Profit Center (read-only).
- **Custom Fields:** empty placeholder for now.

## Footer bar
Previous / Next line buttons, **Item OK** checkbox (same as the OK column in the table), and a **Line** box to jump to a line number.

## Behaviour
- Clicking a line number in the table selects it; line 1 is selected by default.
- Grey fields are read-only (filled from SAP later); white fields are editable.
- Design only — still no SAP fetch/post until the GRN APIs are provided.

## Technical
- All in `src/pages/GRNCreate.tsx`; extend `Row` with the new fields (supplierMatNo, materialGroup, ean, eanCheck, qtySku, qtyDelNote, containers, goodsRecipient, unloadingPoint, itemText, itemCategory, profitCenter names, etc.).
- Uses existing shadcn Tabs/Input/Select/Checkbox and semantic tokens.
