
## Revised Kickoff Deck — DMR & GRN Portal

Regenerate `/mnt/documents/DMR_GRN_Kickoff_Rithwik_SIPL_23_07_26_v2.pptx` with the following changes. All other content (Agenda, Objectives, Team, Governance, Hypercare, Thank You) stays intact.

### 1. Simpler header based on the logos
- Drop the dark navy brand strip and the fake "S" tile + all-caps labels.
- New header: clean **white band** with a thin teal `#217F76` bottom rule (1pt).
  - Left: **Rithwik logo** (from `user-uploads://Rithwik.jpg` — SVG, teal wordmark) — height ~0.42″.
  - Right: **Sharvi Infotech logo** (from `user-uploads://Sharvi_Logo.jpg`) — height ~0.42″, right-aligned.
  - Section label (e.g. "AGENDA") sits below the rule in teal small-caps.
- Footer: thin rule + one-line meta (`Rithwik ⇄ Sharvi Infotech · Kickoff 23 July 2026`) + `Page N`.

### 2. Logos on every slide
- Embed both logos as base64 via `pptxgenjs` `addImage({ data: ... })`.
- Rithwik SVG → rasterise once to PNG (`/tmp/ppt/rithwik.png`, 600px wide) so LibreOffice PDF export renders it reliably.
- Sharvi JPG used as-is.
- Title (Slide 1) and Thank You (Slide 12): both logos centered above the title, larger (~0.9″ tall), with "in partnership with" between them.

### 3. 12-week duration (was 8)
- **Slide 1:** subtitle "12-Week Implementation · Kickoff 23 July 2026".
- **Slide 3:** Duration tile → `12 Weeks`.
- **Slide 8 (Timeline W1–W12):**
  - W1 Mobilisation & BPD walkthrough
  - W1–W3 As-Is study & Requirements freeze
  - W3–W6 DMR/GRN portal configuration & dev sprint
  - W4–W8 SAP Public Cloud integration & OCR tuning
  - W8–W9 SIT
  - W9–W10 UAT
  - W10 Training
  - W11 Cutover preparation & data migration
  - W12 Go-Live → Hypercare (3 months)
- **Slide 10 (Governance):** milestones "BPD W3, UAT W10, Go-Live W12".
- Slide 12 checkpoint strip updated to 12-week milestones.

### 4. Slide 5 — clearer End-to-End Process Flow
- Top: workflow diagram (`image-45.png`), scaled ~5.5″ wide, centered.
- Bottom: **4-column explainer** with icons + short text per swim-lane:
  1. **Site Engineer** — Captures invoice/DC via mobile PWA; Gemini Vision OCR extracts header + line items; offline manual edit supported.
  2. **Store Team** — Verifies extracted data against PO, approves DMR, pushes header + items to SAP Gate Entry via OData.
  3. **Accounts HO** — Uploads final invoice, adds financial inputs (tax, freight, discounts), triggers GRN posting.
  4. **SAP Public Cloud** — Executes MIGO (GRN), MIRO / FB50 (invoice posting) via public APIs; returns doc numbers back to the portal in real-time.
- Caption: "One capture at site → validated at store → approved at HO → posted in SAP Public Cloud, with full audit trail."

### 5. SAP S/4HANA → SAP Public Cloud (global rename)
Replace every occurrence of "SAP S/4HANA" with **"SAP Public Cloud"** across the deck. Known affected spots:
- **Slide 6 (Scope Detail):** "SAP Integration modules" list — Gate Service create/update, Header + Item OData writes, PO/GRN posting MIGO, FB50/MIRO — reframed as **SAP Public Cloud APIs** (public OData/REST endpoints exposed by the customer's SAP Public Cloud tenant).
- **Slide 7 (Solution Architecture):** node label changes from "SAP S/4HANA OData (Gate/MM/FI)" to **"SAP Public Cloud APIs (Gate / MM / FI)"**; note that middleware calls the customer's public SAP endpoints with tenant credentials.
- **Slide 8 (Timeline):** "SAP OData integration" → "SAP Public Cloud integration".
- **Slide 5 explainer (see §4):** already uses "SAP Public Cloud".
- Any other stray "S/4HANA" / "S/4" mentions across slides are swapped.

### 6. Overall "simple" pass
- Reduce decorative shapes; white cards + thin `#DCE5E4` borders + teal accents only.
- Single accent color (teal `#217F76`); navy only for body text.
- 28–32pt body / 40pt titles / 20pt chrome. More whitespace, fewer pills.

### Build & QA
- Rewrite `/tmp/ppt/build.js`: new logo-based `chrome()`, update Slides 1/3/5/6/7/8/10/12, rasterise Rithwik SVG to PNG at script start.
- Save as `_v2.pptx` (do not overwrite v1).
- Convert to PDF via LibreOffice → `pdftoppm` per slide → visually inspect all 12 slides for logo clarity, overflow, timeline alignment, process-flow readability, and that no "S/4HANA" string remains. Fix and re-verify.
- Deliver via `<presentation-artifact>`.

No app code changes — document artifact only.
