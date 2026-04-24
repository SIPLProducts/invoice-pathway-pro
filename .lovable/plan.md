## Plan: Add inline Edit/Update for Line Items in the DMR → SAP Gate Entries popup

### What you want
On the DMR page → SAP Gate Entries tab → click the **Items** button on any row → the "Line items — A123I00006" popup opens. Today this popup only displays line items as read-only rows. You want each row to have an **Edit** button that turns the row into editable inputs and an **Update** button that PATCHes the changes to SAP via the configured **Update Selected Line Item Data** API.

The middleware route is already in place (`PATCH /api/gate/items/:gateId/:itemNo`), so we only need to wire the UI + a small `useSapItemUpdate` hook + auto-discover the item-update API.

### How it will work end-to-end

1. **Discovery** in `DMRList.tsx`: scan `apis` for an Active API whose name/endpoint matches `/update.*item|item.*update|line[ _-]?item/i` AND has `updateEndpoint` set (template like `/api/gate/items/{gate_id}/{item_no}`). If a match has the name pattern but is missing the template, show a small banner inside the popup ("Item-update API found but template missing → Configure now") just like we already do for header updates.

2. **Auto-migration** in `sapApisStore.ts`: existing user APIs named "Update Selected Item Data" / "Update Line Item" / matching `/update.*item/i` with empty `updateEndpoint` get auto-populated:
   - `updateEndpoint = "/api/gate/items/{gate_id}/{item_no}"`
   - `updateMethod = "PATCH"`
   - `keyField = "item_no"` (gate_id is the parent key)
   This mirrors the one-time header migration already shipped, gated by a new `UPDATE_ITEM_MIG_FLAG`.

3. **`SapLiveTable.tsx`** — extend the props with optional `itemUpdateApi?: SapApi` and `onItemSaved?: () => void`. Pass them straight through to a new `<EditableItemsTable>` rendered inside the existing items `Dialog`. No change to the parent table look.

4. **New component `src/components/EditableItemsTable.tsx`** (~140 lines) — the meat of the change:
   - Renders the same column set as today (`schema.childColumns`) PLUS a trailing **Action** column.
   - State: `const [editingIdx, setEditingIdx] = useState<number | null>(null)` and `const [draft, setDraft] = useState<Record<string, unknown>>({})` for the row currently in edit mode (one row at a time, like the header dialog).
   - Each row in display mode shows an **Edit** pencil button. Clicking it copies the row into `draft` and switches that row's cells to inputs.
   - For the editing row, every cell becomes `<Input>` (number/date/time/text picked using the same `effectiveType` trick we already use in `EditHeaderDialog` — trust the live row's actual primitive type over the schema). Key fields (`item_no`, `gate_id`) are rendered disabled.
   - Action column for the editing row shows **Update** (calls submit) and **Cancel** (resets).
   - Submit calls a new `useSapItemUpdate(api).submit(parentRow, childRow, draft)` hook; on success it toasts, exits edit mode, and calls `onItemSaved()` (which in `DMRList` bumps `refreshKey` so the parent table refetches and the popup re-opens with fresh data — actually we just refresh in place by updating `openRow.items` locally so the popup stays open).

5. **New hook `src/hooks/useSapItemUpdate.ts`** (~90 lines, mirrors `useSapUpdate.ts`):
   - Resolves middleware URL from the API (`resolveProxyUrl`).
   - Builds the URL by substituting BOTH `{gate_id}` (from the parent header row) AND `{item_no}` (from the child row) into `api.updateEndpoint`.
   - Uses the same `sanitizeRow` logic that trusts the live row's primitive types (so `quantity: 100`, `weight: 1000` go on the wire as numbers, not strings — same fix we did for the header dialog).
   - Strips `SAP__Messages`, `@odata.*`, and `null` server-managed fields like `last_changed_at`.
   - Surfaces the same smart SAP error-detail picker (`pickSapDetailMessage`) so property-level errors come through clearly.
   - Forwards manual SAP session headers (`getSapSessionHeaders()`) and the optional `x-proxy-secret`.

6. **`DMRList.tsx`** — discover the item-update API and pass it down:
   ```
   <SapLiveTable
     api={selectedApi}
     schema={...}
     onEdit={...}
     itemUpdateApi={itemUpdateApi}
     onItemSaved={() => setRefreshKey(k => k + 1)}
   />
   ```
   Add a discovery banner identical in style to the existing header-update one when an item-update candidate exists by name but lacks the template.

### What stays the same
- Middleware: zero changes (`PATCH /api/gate/items/:gateId/:itemNo` already exists).
- SAP backend: zero changes.
- Header edit dialog, all proxy fetching, SAP session handling, and existing column rendering: untouched.
- The popup still opens via the existing **Items** button; the Edit/Update affordance only shows when an item-update API is configured (same UX pattern as the row-level Edit button on the parent table).

### Files to change
- `src/lib/sapApisStore.ts` — second one-time migration for "Update * Item" APIs (~20 added lines).
- `src/components/SapLiveTable.tsx` — accept `itemUpdateApi` / `onItemSaved` props; replace inline child-table JSX with `<EditableItemsTable>` (~25 modified lines).
- `src/components/EditableItemsTable.tsx` — NEW, inline row editor + Update/Cancel actions (~140 lines).
- `src/hooks/useSapItemUpdate.ts` — NEW, mirror of `useSapUpdate.ts` with two-key URL substitution (~90 lines).
- `src/pages/DMRList.tsx` — discover `itemUpdateApi`, pass it to `<SapLiveTable>`, add "configure me" banner (~25 added lines).

### Expected result
Open DMR → SAP Gate Entries → click **Items** on `A123I00006`: the existing line-items popup shows up with a new **Edit** button on each row. Clicking Edit turns that row's cells into editable inputs (numbers as number inputs, strings as text). An **Update** button next to the row PATCHes the change to `…/api/gate/items/A123I00006/000001`, the middleware forwards it to SAP, the popup shows the updated row, and the underlying header table refreshes. If anything goes wrong, the toast shows the specific SAP property error (e.g. `Property 'quantity' has invalid value`) instead of a generic message.
