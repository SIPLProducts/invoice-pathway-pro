# Create Service Entry Sheet — screen design

Design only (no SAP calls yet), styled like Create GRN: gradient title strips, separate cards, compact inputs, fits a laptop screen.

## 1. Filters card (top)
Fields in 4 columns: Editing Status (All / Draft / Saved), Supplier, Service Entry Sheet, Name of Service Entry Sheet, Document Status, Approval Status, Created On (date range), Origin. Buttons: **Go**, **Clear**.

## 2. Service Entry Sheets list card (below filters)
Table: Service Entry Sheet, Supplier, Reference Purchase Order, Stated Amount Incl. Input Tax, Name, Document Status, Approval Status, Created On. Search box, count, **Create** button. Shows a sample row until SAP API is given. Clicking a row opens it read-only.

## 3. Create / view sheet (opens on Create)
- Summary strip: Supplier, Document Status, Approval Status, Stated Amount, Stated Amount Incl. Tax.
- Tabs: General Information | Items | Notes | Attachments.
- General: Name of SES*, Reference Purchase Order*, Posting Date for Goods Receipt, Reference; read-only Created By / Created On after save.
- Items: table (PO Item, Product, Item Description, Product Type Group, Ordered: Expected / Stated, Service Start Date, Service End Date, Quantity). **Add** opens "Add Purchase Order Items" popup (filters PO Item, Product, Description; checkbox list with quantity; Show Invalid Items). Missing start/end date or quantity highlighted red.
- Item detail panel (click a line): tabs General Information (Open Qty, Order Qty, Price Unit), Account Assignment (G/L Account, Quantity, Net Amount), Source of Supply, Tax (Tax Code, Tax Date), Pricing (Condition Type, Description, Amount, Currency, Pricing Unit, Condition Basis, Condition Value), Notes, Attachments.
- Footer: **Create**, **Discard Draft**; after create: **Edit**, **Delete**, **Send for Approval** (show popups, no SAP yet).

## Technical
- Rewrite `src/pages/SESCreate.tsx`; split into `src/components/ses/` (SesFilters, SesList, SesForm, AddPoItemsDialog, SesItemDetail).
- Local state only; sample data clearly marked. Hook up SAP once API URL, payload and response are shared.
