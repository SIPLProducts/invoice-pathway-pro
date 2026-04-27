## Goal
Replace the current "Open Capture →" link on **New DMR Entry** with an inline OCR widget that:
- Lets the user **take a photo** with the device camera (works on mobile via `<input type="file" accept="image/*" capture="environment">`).
- Lets the user **upload a PDF or image** (drag-and-drop or browse, up to ~20 MB).
- Sends the file to a backend edge function that calls **Lovable AI** (Google Gemini vision model) to extract invoice fields.
- Auto-fills the existing header form and line items table with the extracted data — leaving the user free to review/edit before submitting to SAP.

This does **not** remove the standalone `/ocr` page; it brings its functionality inline so the user never has to leave the New DMR screen.

---

## 1. Enable Lovable Cloud + edge function

Lovable Cloud is required to run an edge function that holds the `LOVABLE_API_KEY` secret (already provisioned). I'll:

1. Enable Lovable Cloud (one-click) so the project gets a Supabase backend with edge function hosting.
2. Create **`supabase/functions/ocr-invoice/index.ts`**:
   - Accepts `POST` with JSON `{ fileBase64: string, mimeType: string, headerKeys: string[], itemKeys: string[] }`.
   - For PDFs: forwards the base64 directly as an `image_url` data URL — Gemini accepts PDFs natively.
   - For images: same data-URL pattern.
   - Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with model `google/gemini-2.5-flash` (fast + multimodal + cheap; Pro can be swapped later if accuracy needs it).
   - Uses **tool calling** to force structured output. The tool schema is built dynamically from `headerKeys` / `itemKeys` so the model returns exactly the field keys the form expects:
     ```json
     {
       "header": { "<headerKey>": "string|number", ... },
       "items":  [{ "<itemKey>": "string|number", ... }],
       "confidence": { "<key>": 0.0-1.0 }
     }
     ```
   - Handles `429` (rate limit) and `402` (out of credits) and surfaces them as JSON errors.
   - CORS headers + `OPTIONS` preflight.
3. Add the function to `supabase/config.toml` with `verify_jwt = false` so the form can call it without auth (the form itself is already behind app login).

---

## 2. New component: `src/components/OcrCaptureCard.tsx`

A self-contained inline widget that replaces the existing "Start with OCR Capture" banner on `DMRNew.tsx`. It will render:

- Three action buttons in one row:
  - **Take Photo** — `<input type="file" accept="image/*" capture="environment">` (mobile opens rear camera; desktop opens file picker).
  - **Upload PDF / Image** — `<input type="file" accept="application/pdf,image/*">` plus a drag-and-drop zone wrapping the whole card.
  - **Clear** — appears once a file is staged.
- A small thumbnail preview (image) or filename chip (PDF) once a file is selected.
- An **Extract with AI** primary button that:
  1. Reads the file as base64.
  2. Calls the `ocr-invoice` edge function with `headerKeys` + `itemKeys` derived from the current form schema.
  3. Shows an inline progress state ("Extracting… ~3s").
  4. On success, calls `props.onExtracted({ header, items, confidence })`.
  5. On failure, surfaces the error via `toast.error` with specific messaging for 402/429.
- A small confidence summary ("8 of 10 fields detected · avg 87%") after a successful extraction.

Props:
```ts
{
  headerFields: FieldDef[];
  itemFields: FieldDef[];
  onExtracted: (data: {
    header: Record<string, string|number|boolean>;
    items: Record<string, string|number|boolean>[];
    confidence: Record<string, number>;
  }) => void;
}
```

---

## 3. Wire into `src/pages/DMRNew.tsx`

- Replace the existing `<div className="mb-5 rounded-xl border-2 border-dashed …">` block (lines ~193-202, the "Start with OCR Capture" banner that links out to `/ocr`) with the new `<OcrCaptureCard …/>`.
- In the parent, when `onExtracted` fires:
  - Merge `extracted.header` into the current `header` state (only setting keys that exist in `headerFields` and that came back non-empty — never overwriting with blanks).
  - Replace `items` with `extracted.items` if any rows were returned; otherwise keep the existing single empty row.
  - Toast a success message with the field count.
  - Auto-scroll to the header form so the user sees the populated fields.
- Keep the existing **Submit to SAP** flow untouched — OCR only fills the form; the user still reviews and clicks Submit.

---

## 4. Field-key hinting for better accuracy

Since SAP field keys (e.g. `vendor_code`, `gross_weight`, `_Item.material_code`) aren't human-readable, the edge function's system prompt will include the `label` for each `FieldDef` (already on the schema) so Gemini can map invoice content → field correctly. Example prompt fragment built server-side:
```
Header fields to extract:
- vendor_name (Vendor Name) — string
- gross_weight (Gross Weight, kg) — number
- invoice_no (Invoice No) — string
...
Line item fields (one row per material/service line):
- material_code (Material Code) — string
- qty (Quantity) — number
- rate (Rate) — number
```

This is sent on every call so it works for whatever SAP API the user has configured (no hard-coded SAP fields in the edge function).

---

## 5. Files touched

**Created**
- `supabase/functions/ocr-invoice/index.ts` — Lovable AI Gateway call with dynamic tool schema.
- `src/components/OcrCaptureCard.tsx` — inline camera/upload/extract UI.

**Modified**
- `src/pages/DMRNew.tsx` — swap the static OCR banner for `<OcrCaptureCard>`, handle `onExtracted` to merge into header/items state.
- `supabase/config.toml` — register the new function with `verify_jwt = false`.

**Untouched**
- `src/pages/OCRCapture.tsx` (the standalone `/ocr` mock page) — left as-is.
- All SAP submit/middleware logic in `useSapCreate.ts` and `sapApisStore.ts`.

---

## 6. What the user will see after this lands

On `/dmr/new`, the OCR banner becomes a working widget:
1. Tap **Take Photo** on mobile → camera opens → snap invoice → tap **Extract with AI**.
2. Or drag a PDF onto the card on desktop → tap **Extract with AI**.
3. ~2-4 seconds later, the **Header** form and **Line Items** table fill in automatically.
4. Review/correct any field, then tap **Submit to SAP** as before.

---

## 7. Notes / non-goals

- **Cost**: Each extraction is one Gemini Flash call with one image/PDF. Free tier allotment covers light testing; heavier use will draw from workspace credits (the 402 error path tells the user when this happens).
- **Confidence indicators on individual fields** (like the `/ocr` mock shows) can be added later — for v1 we surface only the aggregate.
- **Multi-page PDFs**: Gemini reads all pages of a PDF in a single call, so multi-page invoices work.
- **No data sync between users** is added by this change — OCR runs per-session, results land in the form and only persist once the user submits to SAP.