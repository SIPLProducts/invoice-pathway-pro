## Issues you're hitting

Looking at your screenshot and the runtime logs, there are **two separate bugs**, both introduced by recent changes:

### 1. ❌ "Edit" on a gate header opens with the **item** endpoint and "(no key)"

Your screenshot shows:
- Dialog title: `Edit header — (no key)` (should be `Edit header — A123I00005`)
- Endpoint: `PATCH /api/gate/items/{gate_id}/{item_no}` (should be `PATCH /api/gate/headers/{gate_id}`)
- Warning: `Cannot resolve placeholder {item_no}` (correct — a header row has no `item_no`)

**Root cause** — in `src/pages/DMRList.tsx` (lines 59–77), the API selector for header updates is too loose:

```ts
const matchedWithTpl = apis.find(a => updateRe.test(... a.name ...));   // requires "update gate" / "update header" in name
const anyWithTpl     = apis.find(a => a.updateEndpoint && !itemUpdateRePre.test(...));
const updateApi      = matchedWithTpl ?? anyWithTpl ?? (selectedApi?.updateEndpoint ? selectedApi : null);
```

If your header-update API isn't named exactly `Update Gate Header` (or similar), `matchedWithTpl` is `null`. The code then falls back to `anyWithTpl` — which scans **all** APIs that have *any* `updateEndpoint` and the wrong one wins (e.g. an item-update API whose name doesn't contain the word "item"). The dialog then receives an API whose `updateEndpoint` template is `/api/gate/items/{gate_id}/{item_no}` and whose `keyField` isn't `gate_id` — hence the "(no key)" title.

### 2. ❌ Runtime error: `cannot add postgres_changes callbacks ... after subscribe()`

In `src/lib/sapApisStore.ts` (line 533), `subscribeRealtime()` is called every time the module is imported. Vite's HMR re-runs the module on hot reload but the previous Supabase channel object lingers — the second call tries to `.on(...)` on an already-subscribed channel, which the Supabase client rejects with that exact error message. This crashes the page during dev.

---

## Fix plan

### A. `src/lib/sapApisStore.ts` — make realtime subscription idempotent
- Track the channel in a module-level `let realtimeChannel: RealtimeChannel | null = null`.
- In `subscribeRealtime()`, if `realtimeChannel` already exists, `removeChannel` it first before creating a new one.
- Wrap the bootstrap call in a guard so HMR re-imports don't double-subscribe.

This kills the runtime error during development and on every published build.

### B. `src/pages/DMRList.tsx` — pick the **right** header-update API, every time
Tighten the selection logic so we never accidentally pass an item-update API to `EditHeaderDialog`:

1. **Header update API**: must
   - have `updateEndpoint` set
   - NOT match the item regex (`/item|line[ _-]?item/i`)
   - prefer endpoints containing `/headers/` over anything else
   - prefer name matching `update.*gate|gate.*update|update.*header`

2. **Item update API** (unchanged): must match item regex AND have `updateEndpoint` containing `/items/`.

3. Add a defensive check: if the chosen `updateApi.updateEndpoint` contains `{item_no}` or the substring `/items/`, treat it as **not configured** and show the warning banner instead of opening a broken dialog.

### C. (Small UX guard) `src/components/EditHeaderDialog.tsx`
- If `api.updateEndpoint` references `{item_no}` (an item-only placeholder), refuse to render the form and show a clear "This is an item-update API, not a header-update API — please configure a separate header-update API in SAP Settings" message. Defense-in-depth so a misconfiguration can never silently PATCH the wrong endpoint.

---

## Files to change
| File | Change |
|------|--------|
| `src/lib/sapApisStore.ts` | Idempotent realtime subscription (track + remove existing channel) |
| `src/pages/DMRList.tsx` | Stricter header-update API selector; never fall through to item-update API |
| `src/components/EditHeaderDialog.tsx` | Defensive guard against item-only templates |

No DB migration, no schema changes. Pure front-end fix.

---

## After the fix
- The "Edit" button on a gate header row will open with title `Edit header — A123I00005` and endpoint `PATCH /api/gate/headers/{gate_id}`.
- The Supabase realtime crash on hot reload will stop.
- If your header-update API is genuinely missing/misconfigured, you'll see the existing "Update Endpoint not configured" banner with a "Configure now" link instead of a broken dialog.

Approve and I'll apply the changes.