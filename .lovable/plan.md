# Replace "Update Header Data" with "Update DMR Based on Gate ID"

## What the user will see
- In SAP API Settings, the old **Update Header Data** entry is removed and a new **Update DMR Based on Gate ID** entry appears, pointing at:
  `PATCH .../zsd_gate_entry/0001/GateHeader('{gate_id}')` (Basic Auth, CSRF fetch before the write, same as Postman).
- On **Update DMR** (and the All DMR edit popup), only the boxes the user actually changed are sent to SAP.
  Example: user changes Vehicle and Driver only → SAP receives exactly:
  ```json
  { "VehicleNo": "TS09AB1237", "DriverName": "Test Driver 26-11-2026" }
  ```
- If nothing was changed, **Save changes** is disabled with a note "No changes to send".
- The dialog shows a small "Will send" preview of the changed fields before saving.

## How it works
1. When the edit popup opens, the current SAP values are remembered.
2. On save, each box is compared with its original value (after normalising dates, times and numbers so "10:24" vs "10:24:00" does not count as a change).
3. Only differing fields go into the body, using SAP's own names (VehicleNo, DriverName, ...). Gate ID is never in the body — it goes in the URL as `GateHeader('2008260012')`.

## Technical details
- `src/lib/sapApisStore.ts`: replace the "Update Header Data" seed with "Update DMR Based on Gate ID"; endpoint `GateHeader('{gate_id}')`, csrf enabled; existing saved rows named "Update Header Data" are migrated/removed on load so the old config is never picked.
- `src/hooks/useGateApis.ts`: header-update matcher also recognises the new name ("update dmr").
- Key predicate: send `x-sap-header-keys` empty for this API so middleware `headerKey()` builds `('id')` instead of `(GateId='id')` (already supported in `middleware/src/sapTarget.js`, no middleware change needed).
- `src/components/EditHeaderDialog.tsx`: new pure helper `buildChangedPayload(initial, values, fields, row)` in `src/lib/changedPayload.ts`; disable save when empty; preview list.
- Tests in `src/test/changedPayload.test.ts`: only changed fields sent; unchanged time "10:24" vs "10:24:00" excluded; GateId never included; empty result when no change.
- No real SAP PATCH will be run (would change a live DMR).
