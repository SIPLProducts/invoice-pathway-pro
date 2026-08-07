# SAP Entries Tracker — align columns with the uploaded sheet

Rebuild the Tracker table so the three sub-tabs show exactly the fields listed in `SAP_Tracker.xlsx`, in the sheet's order, with demo data filled in for every new column.

## Columns per tab

**Accounts / HO Fields (7)**
SAP Posting Date · SAP DOC NO · MIRO · Bills Status · Type of Bill · Bills/Mail received Date · Days

**Site Fields (23)**
SI.No · Site Document Nos · GRN No./Non PO · PO No. · Project Name · Profit Center · GL Code Non PO Bills · Vendor Code · Vendor Name · Invoice No. · Invoice Date · Basic Amount · SGST · CGST · IGST · Others · Total Invoice Amount · TDS · RM · Other deductions · Net Amount · Requester · Remarks

**All (31)**
The 7 Accounts/HO columns, then the 23 Site columns, then DMS Attachment Status.

## Data

Extend the demo tracker records so every new field carries a realistic value: project names and profit centres per site, bill type (PO / Non-PO / PR), posting and mail-received dates with a derived Days ageing, basic amount vs. total, Others, RM and other deductions feeding Net Amount, requester name, short remarks, and a DMS attachment status (Attached / Pending).

## Presentation

- Amount columns right-aligned and monospaced; Bills Status keeps the existing status badge.
- Days highlighted amber above 3 and red above 7, as today.
- Table stays horizontally scrollable with a sticky header row; search continues to match document no., invoice, vendor, PO and MIRO.
- Export and Advanced buttons stay as-is.

## Technical notes

- Extend the `SAPEntry` type in `src/lib/types.ts` with the new fields and populate them in `src/lib/seed.ts`.
- Rewrite the table in `src/pages/Tracker.tsx` around a single column definition array (key, header, tab membership, alignment, renderer) so the three tabs are filtered views of one list rather than hand-written conditionals.
- No backend or SAP integration changes; this is presentation plus demo data only.
