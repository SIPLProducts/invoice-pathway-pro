## Root cause

The line-item PATCH is going to `/api/gate/items/A123I00016` (no `item_no`), and the middleware route is `/api/gate/items/:gateId/:itemNo`, so it returns 404 with `No route for PATCH /api/gate/items/A123I00016`.

Why: the "Update Selected Line Item Data" API config that drives item updates currently has an `updateEndpoint` template missing the `{item_no}` token. It probably got saved/edited at some point as `/api/gate/items/{gate_id}` (the seed shipped `/api/gate/items/{gate_id}/{item_no}` but Cloud has a stale row).

The hook in `src/hooks/useSapItemUpdate.ts` faithfully fills only the tokens that exist in the template, so without `{item_no}` the URL never includes the item number.

## Fix

1. Self-heal the item-update template at runtime (no manual settings change needed):
   - In `src/hooks/useSapItemUpdate.ts` (or in `DMRList.tsx` where `itemUpdateApi` is selected), normalize a template that targets `/items/...` but is missing `{item_no}`.
   - If template ends with `/{gate_id}` (or any single token) and points at `/items/`, append `/{item_no}` automatically.
   - If template has no token at all but matches `/items`, append `/{gate_id}/{item_no}`.
   - This guarantees the resolved URL includes both keys regardless of what's stored in Cloud.

2. Defensive guard so we never call an item endpoint without `item_no`:
   - After token resolution, if the API was selected as the item-update API but the resolved URL still doesn't contain the item key value, return a clear error toast: "Item update template is missing `{item_no}` — fix it in SAP Settings → Update Selected Line Item Data → API Details."

3. Re-seed the correct template in Cloud (one-time, idempotent):
   - In `src/lib/sapApisStore.ts`, during `bootstrapCloud`, detect any existing row whose name matches the item-update API but whose `updateEndpoint` doesn't include `{item_no}`. Upsert it back to the seed template `/api/gate/items/{gate_id}/{item_no}`. This corrects all already-saved Cloud configs across devices.
   - Same fix for `proxyPath` if it's also missing `{item_no}`.

4. Verify with the existing live SAP gate data after the fix:
   - PATCH should go to `/api/gate/items/A123I00016/1` (or whichever `item_no`) and return 200/204.

## Files to change

- `src/hooks/useSapItemUpdate.ts` — auto-append `{item_no}` when target is `/items/` and template lacks the token; add the guard error.
- `src/lib/sapApisStore.ts` — one-time Cloud self-heal of the item-update API's `updateEndpoint` and `proxyPath`.

## Out of scope

- No middleware or DB schema changes.
- No UI/layout changes.
- No changes to header update flow.