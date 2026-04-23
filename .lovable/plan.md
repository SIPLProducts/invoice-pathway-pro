

## Plan: Wire "GET DMR LIST" to the SAP Gate Entries tab + remove 3 unwanted APIs (no storage reset)

### What you want
1. Keep the **GET DMR LIST** API you just added in API Settings — do not remove it, do not reset it.
2. Make the **SAP Gate Entries** tab on Daily Material Receipts use that GET DMR LIST API.
3. Permanently remove `SAP_343_Blocked_To_Unrestricted`, `SAP_344_Unrestricted_To_Blocked`, `MB52_Stock_Report` from API Settings without wiping any of your other edits.

### Approach (no `STORAGE_KEY` bump — your edits and your GET DMR LIST stay intact)

**1. `src/lib/sapApisStore.ts`**
- Remove the 3 unwanted entries from the in-memory `seed` array so they never come back on a fresh install.
- Add a tiny one-time **migration** inside `load()` (keyed by a separate flag like `dmr.sapApis.cleanup.v1` in `localStorage`) that:
  - deletes any stored entries named `SAP_343_Blocked_To_Unrestricted`, `SAP_344_Unrestricted_To_Blocked`, `MB52_Stock_Report`,
  - writes the cleaned list back,
  - sets the flag so it only runs once.
- Does **not** touch `STORAGE_KEY`. Your `GET DMR LIST` API and all other edits remain untouched.

**2. `src/pages/DMRList.tsx` — SAP Gate Entries tab selection**
- Update the `liveApis` filter to prefer `GET DMR LIST` (your new API) when present, falling back to the existing gate-service match:
  ```ts
  const liveApis = apis.filter((a) => {
    if (a.method !== "GET" || a.status !== "Active") return false;
    const hay = `${a.name} ${a.endpoint} ${a.proxyPath ?? ""}`.toLowerCase();
    return /get[ _-]?dmr|dmr[ _-]?list|gate(header|service)/.test(hay);
  });
  // Prefer an explicit "GET DMR LIST" match if present
  const selectedApi =
    liveApis.find((a) => /get[ _-]?dmr[ _-]?list/i.test(a.name)) ??
    liveApis[0] ??
    null;
  ```
- Update the empty-state hint to mention `GET DMR LIST`.

**3. No middleware change.** The proxy/middleware path already handled by `useSapProxy` works for any GET API row, including your `GET DMR LIST`.

### What stays the same
- `STORAGE_KEY` is **not** bumped — none of your saved API edits, middleware URLs, pasted cookies, or the new `GET DMR LIST` row are reset.
- `Create_Gate_Service` (New DMR submit) is untouched.
- Per-row delete in API Settings still works as before.

### Caveats
- For the GET DMR LIST tab to actually return rows, that API row must have:
  - `method: GET`, `status: Active`,
  - a working `proxyPath` (or middleware URL) pointing at the gate header endpoint,
  - a response schema configured (so columns render). If it was created via "Add API" without response fields, open it in advanced edit and paste a sample response so columns auto-detect — same as `ZUI_Gate_Service`.

### Files to change
- `src/lib/sapApisStore.ts` — drop the 3 entries from `seed`; add one-time cleanup migration in `load()` keyed by a separate flag.
- `src/pages/DMRList.tsx` — broaden filter to also match `GET DMR LIST` / `dmr_list`; prefer it as the selected API; update empty-state copy.

### Expected result
- API Settings: the 3 unwanted APIs are gone (one-time, automatic). `GET DMR LIST` and every other API you configured remain exactly as you left them.
- DMR → SAP Gate Entries tab: rows are fetched via your `GET DMR LIST` API.

