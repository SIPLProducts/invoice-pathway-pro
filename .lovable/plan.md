

## Plan: Stop user-created APIs from "disappearing"

### Why it's happening (root cause)

Your three APIs (`Get DMR List`, `Update Header Details`, `Update Selected Item Data`) are **never deleted by code** — `sapApisStore.ts` only removes 3 specific deprecated default names (`SAP_343_…`, `SAP_344_…`, `MB52_Stock_Report`), and the table on `/sap/settings` renders every API without filtering.

What actually wipes them is **`localStorage` scoping**. APIs are persisted ONLY in `localStorage["dmr.sapApis.v3"]` of the current iframe origin. When ANY of these happen, the new page load sees empty storage and falls back to the 2-API seed:

1. The Lovable preview iframe gets a new sandboxed origin (rebuild / refresh after publish).
2. You open the published URL vs the preview URL (different origin → different storage).
3. You open the app in another browser/device or in incognito.
4. Browser cache/site-data cleanup runs.
5. A code change here bumps `STORAGE_KEY` (we did this once: `v2 → v3`).

There is currently **no backup** anywhere — no file, no Lovable Cloud, no export. So once localStorage is empty, your custom APIs are gone for good.

### Fix — three layers of protection

**Layer 1: Stop creating new "fresh fallback" moments**
- `src/lib/sapApisStore.ts` — when `localStorage` is empty AND we have NO older-version key either, we still seed. But when we DO find any older-version key (`dmr.sapApis.v2`, `dmr.sapApis.v1`), migrate it forward to `v3` instead of seeding. This rescues anyone who upgraded across a key bump.
- Never bump `STORAGE_KEY` again without a migration path. (Add a code comment that says so.)

**Layer 2: Make the seed non-destructive**
- Current behaviour merges seed only when storage is missing. Change to: on every load, if `state` lacks an API whose `name` matches a seed entry, **append** the seed entry (don't overwrite). This way the 2 default APIs (`ZMRB_Inward_Inspection`, `ZUI_Gate_Service`) are always available, but your custom ones are never wiped to make room for them.

**Layer 3: Manual export / import + auto-backup snapshot**
- `src/lib/sapApisStore.ts` — add `exportApis(): string` (JSON) and `importApis(json: string): { added: number; replaced: number }`.
- Whenever `emit()` runs (any add/edit/delete), also write a rolling timestamped snapshot to `localStorage["dmr.sapApis.backup.latest"]` (single slot, overwritten). On `load()`, if the main key is missing but the backup is present, restore from backup automatically and toast "Restored N APIs from backup".
- `src/pages/SAPSettings.tsx` — add two small buttons next to **Add API Configuration**:
  - **Export APIs** → downloads `sap-apis-YYYY-MM-DD.json` (calls `exportApis()`).
  - **Import APIs** → file picker → calls `importApis(text)` → toast "Imported X new, updated Y".
- This gives you a real off-browser copy you can re-import anytime the iframe storage resets.

### What stays the same
- All other code: middleware, hooks, dialogs, edit page — untouched.
- The 2 default seed APIs continue to appear out-of-the-box for new users.
- Storage key `dmr.sapApis.v3` stays (no migration churn for existing users).
- No new dependencies.

### Files to change
- `src/lib/sapApisStore.ts` — non-destructive seed merge, backward migration from v1/v2, auto-backup slot, `exportApis`/`importApis` helpers (~50 added lines).
- `src/pages/SAPSettings.tsx` — Export / Import buttons in the API Configurations toolbar (~25 added lines).

### Recovery path right now
After this change deploys, on first load the code will:
1. Read `dmr.sapApis.v3` — if present, use it.
2. Else read `dmr.sapApis.v2` or `v1` — if present, migrate forward (your APIs come back).
3. Else read `dmr.sapApis.backup.latest` — if present, restore.
4. Else fall back to the 2-API seed.

If none of those have your three APIs (because the iframe origin truly never saw them — e.g. you created them only in the published URL but are now viewing preview), the cleanest fix is: open the page where they DO exist, click **Export APIs**, then come back here and click **Import APIs**.

### Expected result
Your custom APIs (`Get DMR List`, `Update Header Details`, `Update Selected Item Data`) will:
- Survive every reload, rebuild, and the next storage-key migration automatically.
- Coexist with the default seed instead of being replaced by it.
- Be one-click exportable to a JSON file you keep, and one-click re-importable on any browser/device.

