# Weights move to Line Items + OBD lookup popup

## 1. Move weight fields
- Add **Gross Weight**, **Tare Weight**, **Net Weight** (numeric, right-aligned) to the Line Items (_Item) field set, positioned immediately before **Shortage/Brekages**.
- Remove those three fields from the ZUI_Gate_Service Header field set (they no longer appear in the header form).
- Bump the header and item field-version markers so configs already saved in the cloud self-heal to the new sets on next load.
- Line Items keeps its current layout, styling, horizontal scrolling, and behaviour; column count becomes 34.

## 2. OBD lookup
- Add a compact **Enter** button beside the OBD input, styled exactly like the existing PO Number Enter button; keyboard Enter in the OBD field triggers the same action.
- Fetch OBD details through the middleware using a new SAP API config entry ("Get OBD Details", path template `/api/obd/{obd_number}`), configurable in SAP Settings like Get PO Details.
- Results open in a **popup dialog** titled "OBD Details" listing the returned OBD lines in a read-only, horizontally scrollable table.
- Loading spinner inside the button while fetching; "OBD not found" message in the dialog when the OBD is invalid; middleware/config errors shown inline in the same style as PO errors.
- No navigation, no extra search button, no changes to the Header layout or the Line Items table itself.

## Technical notes
- `src/lib/sapApisStore.ts`: edit `GATE_ITEM_REQUEST` and `GATE_HEADER_REQUEST`, bump `GATE_ITEM_FIELDS_VERSION` / `GATE_HEADER_FIELDS_VERSION`, add `OBD_LINE_FIELDS` and a "Get OBD Details" seed API.
- New `src/hooks/useSapObdLookup.ts` mirroring `useSapPoLookup` (token `{obd_number}`, same session-header and error handling).
- `src/pages/DMRNew.tsx`: OBD field gets the button + Enter key handler; add a shadcn `Dialog` rendering the OBD lines table.
