
## Kickoff Deck — DMR & GRN Portal

**Client:** Rithwik  ·  **Partner:** Sharvi Infotech Pvt. Ltd.
**Kickoff Date:** 23-July-2026  ·  **Duration:** 8 Weeks + Hypercare
**Output:** `/mnt/documents/DMR_GRN_Kickoff_Rithwik_SIPL_23_07_26.pptx` (built with pptxgenjs, following the uploaded reference structure)

### Visual theme (matches the running portal)
- **Primary teal** `#217F76` (HSL 174 60% 33%) — headers, milestone chips, accents
- **Dark sidebar navy** `#142B33` — title bar band, section dividers
- **Surface** `#F5F8F8` cards on white; borders `#DCE5E4`
- **Status colors:** success `#188A5B`, warning `#F5A524`, info `#2AA39A`, pending `#8B5FBF`
- **Fonts:** Plus Jakarta Sans (titles) · Inter (body) · JetBrains Mono (IDs)
- **Logos:** Rithwik (top-left) & Sharvi Infotech (top-right) on every slide, mirroring the reference deck footer strip

### Slide list (12 slides)
1. **Title** — "DMR & GRN Portal · Project Kickoff", Rithwik ⇄ Sharvi, 23-Jul-2026
2. **Agenda** — 8 numbered tiles
3. **About the Engagement** — Client / Implementation Partner cards + kickoff/duration/scope/hypercare stat row
4. **Project Objectives** — 4 tiles: Digitise Material Receipt, Mobile-first PWA + OCR, SAP as SoT, Real-time KPI visibility
5. **Scope — Process Diagram** — embed the uploaded workflow PNG (`image-45.png`) full-width with swim-lane labels (Site Engineer / Store / Accounts HO / SAP)
6. **Scope Detail** — two-column: *DMR & GRN Portal features* (OCR capture, PWA, per-row line-item edit, approval workflow, SAP API config, export/import, RBAC) vs *SAP Integration modules* (Gate Service create/update, Header + Item OData writes, PO/GRN posting MIGO, FB50/MIRO, dashboards)
7. **Solution Architecture** — React PWA · Lovable Cloud (Supabase RLS/Storage) · Gemini Vision OCR · Node middleware · SAP S/4HANA OData (Gate/MM/FI)
8. **Timeline — 8 Weeks** — Gantt-style bars across W1–W8:
   - W1 Mobilisation & BPD walkthrough
   - W1–W2 As-Is / Requirements freeze
   - W2–W4 Configuration & DMR/GRN dev sprint
   - W3–W5 SAP OData integration & OCR tuning
   - W5–W6 SIT
   - W6–W7 UAT
   - W7 Training
   - W8 Cutover & Go-Live → Hypercare (3 months)
9. **SIPL Delivery Team** — avatar tiles (names/roles pulled from reference deck: PM, SAP Functional, ABAP/Gateway, UI Lead, UI Dev, Integration & Testing)
10. **Governance & Ways of Working** — Cadence (Weekly status, Bi-weekly steerco) + Milestones (BPD W2, UAT W7, Go-Live W8) + Rithwik responsibilities
11. **Post Go-Live Support** — 3-month hypercare inclusion list
12. **Thank You** — mini timeline strip with 5 checkpoints, closing line

### Build & QA
- Generate `.pptx` with pptxgenjs (16:9, US Letter equivalent 13.33×7.5in)
- Embed workflow PNG as base64
- Generate simple text-based Rithwik + Sharvi Infotech logo tiles (or use provided image-45's letterheads via crop) as base64 in header strip
- Convert to PDF via LibreOffice → `pdftoppm` per-slide → visually inspect each slide for overflow / overlap / contrast; fix and re-verify
- Deliver via `<presentation-artifact>` tag

No source code in the app changes — this is a document artifact only.
