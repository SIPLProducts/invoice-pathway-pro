# Plan: PO lookup on the New DMR screen

## Goal
Add a compact **Enter** button beside the PO Number input. Entering a PO number and clicking Enter (or pressing the Enter key in the field) fetches PO details from SAP and shows a read-only **PO Line Items** table below, inside the same Purchase Order Details box. Loading indicator while fetching, "PO Number not found" when invalid. No Search button, no navigation.

## What the user sees
1. Purchase Order Details box: PO Number (left, now with a small Enter button attached at its right edge) and OBD (right). Layout, sizes and styling unchanged.
2. While fetching: a spinner in the button plus a "Fetching PO details…" line under the row.
3. On success: a read-only table below the two fields with columns
   Line ID · Material Code · Material Description · PO Quantity · UOM · Unit Rate · Tax Code · Plant · Storage Location · Open Quantity · Received Quantity.
   Numeric columns right-aligned and monospaced, matching the Line Items table style.
4. On failure / empty result: inline message "PO Number not found" in the destructive colour.
5. Existing Header fields, amount boxes and Line Items (_Item) table are untouched.

## Data source
A new SAP API config entry named **Get PO Details**, seeded in the API store like the existing entries, so it appears in SAP Settings and can be edited there (base URL, endpoint, middleware URL, credentials, proxy path).

- `proxyPath` / `listEndpoint`: `/api/po/{po_number}` (template with a `{po_number}` token)
- `rowsPath`: `value` (adjustable in settings for the real OData shape)
- `responseItemFields`: the eleven columns above, so the table renders from config rather than hardcoded keys
- Middleware URL defaults to empty, same as the other entries; until an admin fills it in, pressing Enter shows a clear "Middleware URL not set — open SAP Settings → Get PO Details" message instead of a silent failure.

## Technical details
- New hook `src/hooks/useSapPoLookup.ts`: resolves the middleware base URL with the existing `resolveProxyUrl`, substitutes `{po_number}` into the endpoint template, sends the same headers as `useSapProxy` (Accept, ngrok-skip, SAP session headers, optional `x-proxy-secret`), parses errors the same way, and returns `{ lines, loading, error, notFound, lookup(poNumber), reset() }`. 404 or an empty row collection maps to `notFound`.
- `src/lib/sapApisStore.ts`: add the `Get PO Details` seed entry and a `PO_LINE_FIELDS` field list; bump the seed/self-heal version constant so existing cloud configs pick up the new entry without wiping user edits.
- `src/pages/DMRNew.tsx`: wrap the PO Number `FieldInput` in a flex row with a compact `Button` (`size="sm"`, h-9, label "Enter"); add `onKeyDown` Enter handling on the input; render the loading / not-found / results states under the existing `Grid` inside the same Section. Typing a new PO number clears previous results.
- The PO lines are display-only: they do not write into `header`, `items`, or the SAP submit body.

## Validation
Typecheck, then load `/dmr/new` in the preview and confirm the Enter button sits beside PO Number, the box layout is unchanged, and the not-found / no-middleware messages appear correctly.
