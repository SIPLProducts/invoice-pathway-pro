

## Make Get_DMR + Create_Gate_Service Work + Filter Source API Dropdowns

### Why no data shows even though middleware returns 200

Your middleware log shows:
```
GET /api/gate/headers 200 810  ← SAP returned data successfully
```

So the network is fine now. The problem is that your **`Get_DMR`** API record (created by you in Settings, separate from the seeded `ZUI_Gate_Service`) is missing the bits the table needs:

- `rowsPath` — without it, `useSapProxy` doesn't know the rows are inside `value`
- `rowKey` — without it, expand/collapse breaks
- `childKey` (`_Item`) — without it, line items don't show as expandable children

Same for **`Create_Gate_Service`** — it has request fields configured (so the New DMR form should look identical to `Get_DMR`'s form), but probably no `rowsPath`/`childKey` either.

### Fix plan

#### 1. Auto-fill gate-shape defaults in `buildSchemaFromApi` (`src/lib/sapApiSchemas.ts`)

When the API's `proxyPath` starts with `/api/gate` OR its name matches `/gate|dmr/i`:
- Default `rowsPath` to `"value"` if missing
- Default `rowKey` to `"gate_id"` if missing
- Default `childKey` to `"_Item"` if missing

This makes any user-created gate API render correctly without forcing them to set obscure fields.

#### 2. Filter Source API dropdown to gate-only entries

**`src/pages/DMRList.tsx`** — "SAP Gate Entries" tab:
- Replace the broad `liveApis` filter with one that only matches APIs whose name matches `/gate|dmr/i` OR whose `proxyPath` starts with `/api/gate`. This hides `MB52_Stock_Report`, `ZMRB_Inward_Inspection`, and the seeded `ZUI_Gate_Service` (we keep only gate-specific user-configured ones; if the user wants `ZUI_Gate_Service` too, it matches the regex — included).
- Show the dropdown even when there's only one match (currently hidden when `liveApis.length <= 1`), so the user can confirm what's selected.

**`src/pages/DMRNew.tsx`** — Source API selector:
- Same gate-only filter (`/gate|dmr/i` or `proxyPath` startsWith `/api/gate`).
- This drops `MB52_Stock_Report` from the dropdown and keeps only `Get_DMR`, `Create_Gate_Service`, and `ZUI_Gate_Service` (or whichever the user has configured as gate APIs).
- Default-select the first match instead of looking for the legacy `ZUI_Gate_Service` name.

#### 3. Make `Create_Gate_Service` behave like `Get_DMR` in New DMR

The component already drives the form purely from `requestHeaderFields` / `requestItemFields`. Two fixes so it "just works" for `Create_Gate_Service`:

- When the user selects an API that has **no** `requestHeaderFields` but **does** have `responseHeaderFields`, automatically derive the form fields (today this requires clicking "Auto-generate from response schema" — make it automatic on selection).
- Keep the existing manual button as a fallback.

Edit in `DMRNew.tsx`:
- After `handleSelectApi`, if header fields end up empty but response fields exist, run the same logic as `autoGenerateFromResponse` automatically.

#### 4. Cosmetic: show clearer "Source API" label + edit link in New DMR

In `DMRNew.tsx`, mirror the DMR list's "Edit fields →" link next to the dropdown so the user can jump straight to the API's settings.

### Files

- Edit: `src/lib/sapApiSchemas.ts` (gate-shape defaults in `buildSchemaFromApi`)
- Edit: `src/pages/DMRList.tsx` (filter gate-only APIs; always show dropdown)
- Edit: `src/pages/DMRNew.tsx` (filter gate-only APIs; auto-derive fields on select; edit link)
- No middleware changes needed — server.js already handles CORS for Lovable origins.

### Result

- DMR → "SAP Gate Entries" → `Get_DMR` selected → table shows all 21 columns from your sample JSON, rows render with `_Item` expandable children.
- Source API dropdown on both DMR list and New DMR shows only `Get_DMR`, `Create_Gate_Service`, `ZUI_Gate_Service` — no more `MB52` / `ZMRB`.
- Selecting `Create_Gate_Service` in New DMR auto-populates the same header form + line-item table as `Get_DMR`.

