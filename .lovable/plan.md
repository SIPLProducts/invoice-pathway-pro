## What I found

The per-row line-item Edit / Update implementation is present in the codebase:

- `EditableItemsTable.tsx` renders Edit / Update / Cancel inside the Items popup.
- `useSapItemUpdate.ts` PATCHes line items using `/api/gate/items/{gate_id}/{item_no}`.
- `DMRList.tsx` passes the item update API into the Items popup.
- Header numeric coercion, auto-detect fields, API migration, and Export / Import APIs are also present.

The issue shown in your screenshot is not that these code changes are missing. The SAP Gate Entries tab is blocked because `ZUI_Gate_Service` has no middleware URL configured in the current browser/session:

```text
Proxy not configured
Set the Node.js Middleware URL on SAP Settings → ZUI_Gate_Service → API Details
```

The second issue, “not reflecting between two people,” happens because SAP API configurations are currently stored only in each browser’s `localStorage`. That means if Person A configures the middleware URL or item-update API, Person B will not automatically receive it.

## Plan to resolve

1. Keep all implemented features intact
   - Preserve header edit numeric handling.
   - Preserve item-level Edit / Update / Cancel in the Items popup.
   - Preserve auto-detect from sample JSON.
   - Preserve API discovery/migration.
   - Preserve Export / Import APIs.

2. Add a shared API configuration fallback
   - Move the default SAP middleware/API configuration into the application seed so a newly opened shared project has working Gate API definitions without relying on another user’s localStorage.
   - Ensure default API records include:
     - live GET API: `/api/gate/headers`
     - header update API/template: `/api/gate/headers/{gate_id}`
     - item update API/template: `/api/gate/items/{gate_id}/{item_no}`
   - If an existing browser already has custom APIs in localStorage, keep those user edits and only add missing defaults non-destructively.

3. Improve SAP Gate Entries diagnostics
   - On the SAP Gate Entries tab, show a clearer action card when the middleware URL is missing.
   - Add direct links/buttons to SAP Settings and the exact API edit screen.
   - Make the message explain that records cannot load until the Node middleware URL is set.

4. Make changes visible across users as much as possible without a backend database
   - Add a lightweight “sync from project defaults” behavior so both people opening the same shared project receive the same baseline API definitions after refresh.
   - Keep Export / Import APIs for truly custom per-user changes, but reduce dependency on it for the standard Gate APIs.

5. Verify after implementation
   - Run tests/build checks.
   - Confirm the SAP Gate Entries tab no longer appears as a missing-code issue; it either loads rows when middleware is configured or shows a precise missing-middleware action message.
   - Confirm the Items popup still shows per-row Edit / Update / Cancel when item update API and middleware URL are configured.

## Technical details

Files to update:

- `src/lib/sapApisStore.ts`
  - Add/ensure seeded default APIs for header update and item update.
  - Strengthen non-destructive migration so missing default fields/endpoints are backfilled.

- `src/pages/DMRList.tsx`
  - Improve SAP Gate Entries configuration messaging.
  - Keep existing `itemUpdateApi` wiring intact.

- `src/components/SapLiveTable.tsx`
  - Improve the “Proxy not configured” empty state with clearer next steps.

Important limitation:

- The app currently has no shared database/auth backend for storing API settings centrally. Without adding Lovable Cloud/Supabase, per-user custom API edits still live in browser localStorage. This fix will make the standard Gate APIs consistent from code defaults, but any one-off changes made by one person still require Export / Import or a future shared database-backed settings feature.