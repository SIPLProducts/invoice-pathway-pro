

## Add API Configuration Capability — SAP Settings

Goal: Enable users to add brand-new SAP API configurations from the SAP API Settings page, have them appear in the Configurations table and Auto-Sync Scheduler, and persist across navigation.

### What you'll see

1. **"+ Add API Configuration" button** opens a dialog (modal) with a quick-add form — faster than navigating to a separate page.
2. **Quick-add fields**: Name, Description, HTTP Method, Auth Type, Endpoint Path, Connection Mode (Proxy / VPN Tunnel / Direct), Status, and an "Enable Auto-Sync" toggle with frequency (every 5/15/30/60 min).
3. **"Advanced setup"** link inside the dialog jumps to the full 6-tab editor (existing `SAPApiEdit` page) for users who need request/response field mapping, credentials, scheduler details, etc.
4. **New entries appear immediately** in the API Configurations table with a green "Active" badge and the appropriate Proxy / VPN Tunnel chip.
5. **Auto-Sync Scheduler table** automatically lists any API with auto-sync enabled, showing frequency, last sync (—), next sync (computed), and Idle status.
6. **Edit / Delete works on user-added rows** as well as seeded ones.
7. **Toast confirmations** on add, edit, and delete.

### Technical approach

- **Shared store**: Create `src/lib/sapApisStore.ts` — a small Zustand-style store (using React context + `useSyncExternalStore`, no new dependency) that holds the list of `SapApi` records, persists to `localStorage` under `dmr.sapApis`, and exposes `addApi`, `updateApi`, `deleteApi`, `toggleStatus`.
- **Seed data**: Move the four hardcoded APIs from `SAPSettings.tsx` into the store as initial seed if `localStorage` is empty. Extend the `SapApi` type with `autoSync?: { enabled: boolean; frequencyMinutes: number; lastSync?: string }`.
- **`SAPSettings.tsx`**:
  - Replace the hardcoded `apis` array with `useSapApis()` from the store.
  - Replace the `<Link to="/sap/settings/edit/new">` button with a Dialog trigger.
  - Build the Auto-Sync Scheduler table dynamically from APIs where `autoSync.enabled === true`.
  - Wire Delete button to `deleteApi` with a confirmation `AlertDialog`.
- **New component `src/components/AddApiDialog.tsx`**: Uses `Dialog`, `Input`, `Select`, `Switch`, `Textarea`, `Button` from shadcn. Validates required fields (Name, Endpoint, Method). On save: calls `addApi`, closes dialog, fires success toast. Includes a footer link "Need request/response field mapping? Open advanced editor →" routing to `/sap/settings/edit/<name>`.
- **`SAPApiEdit.tsx`**: Update the Save handler to call `updateApi` (or `addApi` when `id === "new"`) on the shared store instead of just toasting, so changes round-trip back to the list.
- **`SAPSyncMonitor.tsx`**: Read APIs from the same store so newly added APIs show up in the monitor's connection list automatically.
- **No backend / Lovable Cloud needed** — this is a frontend mock layer consistent with the rest of the prototype. If you later want true persistence and SAP execution, we'd add Lovable Cloud + an edge function that proxies to the Node.js middleware.

### Files

- New: `src/lib/sapApisStore.ts`, `src/components/AddApiDialog.tsx`
- Edit: `src/pages/SAPSettings.tsx`, `src/pages/SAPApiEdit.tsx`, `src/pages/SAPSyncMonitor.tsx`

