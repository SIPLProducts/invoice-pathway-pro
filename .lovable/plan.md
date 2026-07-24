
## Deliverable

Excel workbook `/mnt/documents/DMR_GRN_Project_Plan_v1.xlsx` — DMR & GRN portal implementation for Rithwik by Sharvi Infotech.

- **Kickoff:** Mon 27-Jul-2026
- **Go-Live:** Thu 01-Oct-2026
- **Duration:** 10 calendar weeks (W1–W10), backward-scheduled — W1 now folds kickoff into the As-Is / requirements work (previous standalone W1 removed)
- **Streams:** Web Portal + SAP Public Cloud integration tracked every week

## Workbook structure

**Sheet 1 — `Cover`** — Project name, client (Rithwik), implementer (Sharvi Infotech), kickoff, go-live, hypercare window, version. Teal `#217F76` header band matching portal theme.

**Sheet 2 — `Weekly Plan`** (main sheet)
Columns: Week | Start (Mon) | End (Fri) | Phase | Stream (Web / SAP / Both) | Workstream | Activity | Scope Area (DMR-PO / DMR-WithoutPO-GL / DMR-PR / MIGO / GRN2MIRO / Cross) | Owner | Deliverable | Dependency | Status.

Revised backward-scheduled weeks (kickoff week dropped, everything shifted one week earlier):

- **W1 27-Jul → 31-Jul** — Kickoff + BPD walkthrough on Day 1; As-Is study across DMR (PO / Without-PO GL / PR), MIGO, GRN→MIRO; requirements freeze; API contract sign-off (Gate / MM / FI on SAP Public Cloud); environment & tenant access
- **W2 03-Aug → 07-Aug** — Portal config: DMR-with-PO flow + OCR tuning; SAP: Gate Entry create/update API integration
- **W3 10-Aug → 14-Aug** — Portal: DMR-without-PO (GL account posting) flow; SAP: MIGO (goods receipt) API integration for PO-based DMR
- **W4 17-Aug → 21-Aug** — Portal: DMR-with-PR flow; SAP: MIGO for PR-based DMR; GRN2MIRO tracker skeleton (list + status pipeline)
- **W5 24-Aug → 28-Aug** — GRN2MIRO tracker: MIRO/FB50 posting APIs, invoice matching, exception queue; end-to-end dev complete
- **W6 31-Aug → 04-Sep** — SIT cycle 1: DMR (all 3 variants) + MIGO + GRN2MIRO; defect fix
- **W7 07-Sep → 11-Sep** — SIT cycle 2 + UAT prep; performance & security pass; training material draft
- **W8 14-Sep → 18-Sep** — UAT with Rithwik business users; defect fix cycle 2; training material finalisation
- **W9 21-Sep → 25-Sep** — Training (site engineers, store, accounts HO); cutover rehearsal; master-data & open-PO migration dry-run
- **W10 28-Sep → 01-Oct** — Cutover, production data load, smoke test, **Go-Live Thu 01-Oct-2026**; hypercare kickoff

~4–7 rows per week so both Web and SAP Public Cloud tasks stay visible, each tagged to the correct scope area.

**Sheet 3 — `Gantt`** — Activities pivoted into a W1–W10 grid with teal-filled bars, phase colour legend (Discover / Build / Test / Deploy / Hypercare), and Go-Live marker on W10.

**Sheet 4 — `Milestones`** — Kickoff & Requirements Freeze (W1), Dev Complete (W5), SIT Exit (W7), UAT Sign-off (W8), Cutover Start (W10-Mon), **Go-Live 01-Oct-2026**, Hypercare End (01-Jan-2027).

**Sheet 5 — `RACI`** — Activities × roles (Sharvi PM / Tech Lead / Dev, Rithwik SPOC / Stores / Accounts / IT-SAP Basis) with R/A/C/I.

## Styling

Calibri 10 body / 12 bold headers. Header fill teal `#217F76` white text; borders `#DCE5E4`; alternating band `#F5F8F7`. Frozen top row + first 3 columns on Weekly Plan and Gantt. Wrap on Activity/Deliverable.

## Build & QA

- `openpyxl` script at `/tmp/xlsx/build_plan.py` (xlsx skill).
- Run `recalculate_formulas.py` (week-end = start+4; otherwise static dates).
- Render each sheet to image via LibreOffice → inspect for overflow, wrong dates, missing weeks, wrong Go-Live. Fix and re-run until clean.
- Deliver with `<presentation-artifact path="DMR_GRN_Project_Plan_v1.xlsx" mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></presentation-artifact>`.

No app code changes — Excel artifact only.
