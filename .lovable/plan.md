## Deliverable

A Business Process Design (BPD) document for the **DMR & GRN Portal — SAP Public Cloud integration**, branded with Rithwik and Sharvi Infotech logos.

Outputs to `/mnt/documents`:
1. `DMR_GRN_BPD_v1.docx` — the main BPD document
2. `DMR_GRN_BPD_v1.pdf` — same document as PDF
3. `DMR_GRN_Flows.drawio` — editable draw.io file containing all process flow diagrams (one page per process), so Rithwik can edit diagrams later

## Document structure

**1. Title Page**
Rithwik logo (left) + Sharvi Infotech logo (right), title "Business Process Design — Daily Material Receipt (DMR) & GRN Portal with SAP Public Cloud", client Rithwik Projects Pvt. Ltd., implementation partner Sharvi Infotech, document version/date, prepared-by / reviewed-by / approved-by signature block.

**2. Index Page**
Numbered table of contents with section names and page numbers, plus a document control table (version, date, author, change description).

**3. Process Documents (with flow diagrams)**

Each process gets: purpose, scope, roles involved, step table (Step / Activity / Actor / System / Input / Output), a draw.io swimlane flow diagram image, and business rules / validations.

- **3.1 Gate Entry & Material Receipt at Site** — security gate register digitisation, vehicle/DC/weighment capture, feeding the DMR
- **3.2 DMR with PO Reference** — 10 steps from the draft: material received → OCR/manual capture → data extraction (invoice no, date, value, GST) → PO header validation with SAP → line-item validation against PO → unique project-specific DMR No → GRN (MIGO) with reference to DMR + PO → site accounts three-way match → quantity/value variance check → GRN2MIRO tracker update
- **3.3 DMR with PR Reference** — DMR created first, PR entered manually if available, PO entered and validated once PR is converted, then GRN against DMR + PO
- **3.4 DMR without PO (Non-PO / GL)** — OCR capture, no PO validation, DMR generated, site accounts select GL code, direct FI posting (FB50) route, tracker update
- **3.5 MIGO / GRN Posting** — GRN strictly with reference to DMR number; short quantity, excess quantity, FOC-at-zero-value and quality-hold handling carried over from the current SOP
- **3.6 Exceptions** — short receipt & debit note, excess receipt tracker, quality rejection / material return

**3.1 (as requested) AS-IS vs TO-BE**
A dedicated section comparing the current SOP in `Store_inward_digitilaization.pdf` against the portal design, as a side-by-side table across these dimensions: gate entry register, weighment, document handover, invoice data capture, PO/line-item validation, GRN creation, three-way match, variance handling, tracker maintenance, visibility/audit trail. Each row states AS-IS (manual register, physical document flow, manual SAP entry, Excel tracker) vs TO-BE (mobile OCR capture, portal-validated PO/line items, unique DMR No, GRN via API to SAP Public Cloud, auto-populated GRN2MIRO tracker) plus the resulting benefit. Closes with a gap-and-improvement list drawn from the SOP's own improvement notes (PO short-closure, indent-not-received tracker, digitised inward/returnable register, automated GRN creation, discount on PO price).

**4. GRN2MIRO Tracker**
Purpose and ownership, then the full field dictionary taken from the draft workbook's SAP Entries Tracker: SAP Posting Date, SAP Doc No, MIRO, Bills Status, Type of Bill, Bills/Mail Received Date, Days, Sl. No., Site Document No, GRN No./Non-PO, PO No., Project Name, Profit Center, GL Code (Non-PO), Vendor Code, Vendor Name, Invoice No., Invoice Date, Basic Amount, SGST, CGST, IGST, Others, Total Invoice Amount, TDS, RM, Other Deductions, Net Amount, Requester, Remarks, Vendor PAN, Vendor GST, Vendor State, Vendor Bill Period. Each field gets source (portal / SAP / manual), type and mandatory flag. Includes the tracker status lifecycle (Pending → GRN Done → Three-way matched → MIRO Posted → Payment Released), a variance/exception queue definition, a sample populated extract, and the tracker flow diagram.

**Appendix** — DMR numbering convention, integration end-point summary (Gate Entry, PO read, MIGO, MIRO/FB50 on SAP Public Cloud), glossary.

## Diagrams

Built as draw.io XML (mxGraph) swimlane flowcharts — lanes: Site Engineer / Security, Store Team, Site Accounts, Accounts HO, DMR & GRN Portal, SAP Public Cloud. One diagram page per process (3.1–3.6) plus the GRN2MIRO tracker flow and an AS-IS vs TO-BE comparison diagram. Rendered to PNG via the draw.io CLI and embedded into the document; the `.drawio` source is shipped alongside so diagrams stay editable.

## Styling

Portal theme carried over from the kickoff deck: teal `#217F76` headings and diagram accents, navy `#142B33` text, white background, thin `#DCE5E4` table borders, Calibri/Arial body. Logos in the header of every page.

## Technical notes

- Document generated with `docx` (docx-js) from a Node build script in `/tmp/bpd/`; PDF via LibreOffice.
- Logos from `user-uploads://image-46.png` (Rithwik) and `user-uploads://Sharvi_Logo-2.jpg`; Rithwik mark rasterised at high density as done for the kickoff deck.
- QA: every page rendered to JPG and visually inspected for clipped text, table overflow, missing diagrams and logo distortion; fixed and re-rendered until clean.
- No application code changes — document artifacts only.
