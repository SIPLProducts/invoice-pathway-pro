# DMR Header — Plant, DC Number, and Amount Boxes

Refine the ZUI_GATE_SERVICE header on the New DMR screen. No changes to layout style, navigation, buttons, line items, or submit logic beyond what is listed.

## 1. Header field changes

- Add **Plant** as the first field of the header section (text, before Gate Entry No).
- Rename **DC OBLIG** to **DC Number** and keep **Invoice Number** as its own separate field immediately after it — the two stay distinct, never merged.

Resulting order: Plant, Gate Entry No, Gate Entry Date, Gate Entry Time, Vendor Code, Vendor Name, DC Number, Invoice Number, Invoice Date, … (rest unchanged).

## 2. Amount boxes panel

A right-hand panel on the header card, matching the reference image, with each value in its own separate box:

| Box | Behaviour |
|---|---|
| Total Invoice Value | Calculated from the line items |
| SGST | Typed by the user |
| CGST | Typed by the user |
| IGST | Typed by the user |
| Freight | Typed by the user |
| Other Charges | Typed by the user |
| **Total Amount** | Calculated: Total Invoice Value + SGST + CGST + IGST + Freight + Other Charges |

- Each box is its own bordered card in a stacked column (not one merged block), currency formatted in ₹.
- Total Amount stays highlighted as the emphasised box at the bottom.
- The five tax/charge boxes are editable number inputs; the two totals are read-only.

## Technical notes

- `src/lib/sapApisStore.ts`: add `plant` at the head of the gate header request field list, change `dc_oblig` → `dc_number` with the label "DC Number", and add `sgst`, `cgst`, `igst`, `freight`, `other_charges` as number fields flagged so they render in the totals panel rather than the normal grid. Bump the gate-header fields version so saved cloud configs self-heal to the new set.
- `src/pages/DMRNew.tsx`: split header rendering into the field grid plus a totals sidebar; compute Total Invoice Value from the line-item quantity × rate/amount data and Total Amount from that plus the typed charges. All values are still submitted as part of the header payload.
