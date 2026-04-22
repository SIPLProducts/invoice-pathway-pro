

## Fix: SAP Gate Entries tab not showing the Get_DMR API

### Root cause

`src/pages/DMRList.tsx` filters APIs with a hard-coded regex on the **name**:

```ts
const liveApis = apis.filter((a) => /get[_ ]?dmr/i.test(a.name));
```

After the recent `STORAGE_KEY` bump (`dmr.sapApis.v2` → `v3`) the user's localStorage was re-seeded. The seed only contains `ZUI_Gate_Service` — there is no API whose name matches `get_dmr` anymore, so the tab shows the "No live SAP API configured yet" empty state even though the gate API is configured and working (POST/Submit succeeds, per the network logs).

### Fix

Widen the selection in `src/pages/DMRList.tsx` so it matches **any GET API that targets the gate service**, not just the literal name "Get_DMR":

```ts
const liveApis = apis.filter((a) => {
  if (a.method !== "GET") return false;
  if (a.status !== "Active") return false;
  const isGateByName = /get[_ ]?dmr|gate/i.test(a.name);
  const isGateByPath = /gate(header|service)/i.test(`${a.endpoint} ${a.proxyPath ?? ""}`);
  return isGateByName || isGateByPath;
});
```

This matches:
- the seeded `ZUI_Gate_Service` (GET, endpoint `…/GateHeader…`)
- any user-created API named `Get_DMR`, `Get DMR`, `GetDMRList`, etc.
- any other GET API whose endpoint hits `GateHeader` / `gate_service`

If multiple match, keep the first (`liveApis[0]`) — same as today.

### Also update the empty-state hint

In the same file, change the empty-state text so it points to the actually-seeded API name as well:

> "No live SAP API configured yet. Open SAP Settings and add a GET API for the gate service (e.g. `Get_DMR` or `ZUI_Gate_Service`)."

### Files to change

- `src/pages/DMRList.tsx` — broaden `liveApis` filter and update empty-state copy.

### What stays the same

- No middleware change.
- No store / seed change (nothing to re-seed; the user can still rename the API to `Get_DMR` in SAP Settings if they prefer).
- New DMR page logic (which uses `Create_Gate_Service`) is untouched.

### Expected result

DMR → SAP Gate Entries tab immediately shows the configured `ZUI_Gate_Service` rows fetched via the middleware, exactly like before the storage bump.

