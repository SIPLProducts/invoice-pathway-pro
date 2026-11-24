# Create DMR → Submit to SAP (same as Postman "Create DMR New")

## Goal
Pressing **Submit to SAP** on New DMR sends exactly the payload that works in Postman and shows the new **Gate ID** (e.g. 1000260021) returned by SAP.

## How it will work
```text
New DMR screen ── Submit ──► Middleware
                               1. GET  .../zsd_gate_entry/0001/   (x-csrf-token: fetch, Basic Auth)
                                  ← reads x-csrf-token from reply
                               2. POST .../zsd_gate_entry/0001/GateHeader
                                  (x-csrf-token: <token>, Basic Auth, JSON body)
                                  ← 201 Created + GateId
New DMR screen ◄── "DMR created: Gate ID 1000260021"
```
This is the same thing your Postman "Before request" script does.

## Changes

### 1. Create DMR API address
- Set **Create DMR** in SAP API Settings to:
  `POST https://1f674db9-07aa-4869-885b-435d1624cc4c.abap.us10.hana.ondemand.com/sap/opu/odata4/sap/zsb_gate_entry_o4/srvd_a2x/sap/zsd_gate_entry/0001/GateHeader`
- Check every other API still points to the latest `srvd_a2x/.../GateHeader` address (Update Header, Update Line Item, ZUI_Gate_Service); fix any leftover old ones.

### 2. Payload exactly like Postman
Header: `Plant, GateDate, GateTime, Vendor, VendorName, VehicleNo, DriverName, EntryType`
Items (`_Item`): `Material, MaterialDesc, OpenQty, Plant, PoItem, PoNumber, Quantity, StorageLocation, Unit`
- Screen fields map to these SAP names (e.g. Materials Code → Material, UOM → Unit, Goods Receipt Qty → Quantity, Open Qty → OpenQty).
- Date sent as `YYYY-MM-DD`, time as `HH:MM:SS`, quantities as numbers, empty fields left out (empty text like StorageLocation sent as "").
- `EntryType` defaults to `IN`.
- Only fields marked "Send to SAP" go in the request; the others stay on screen only.

### 3. New "Scripts" tab per API (like Postman)
In each API's edit page, add a **Scripts** tab with:
- **Before request: fetch CSRF token** (on/off). On for Create / Update APIs, off for GET APIs.
- **CSRF fetch address** (default: the service root ending in `/0001/`).
- **Authorization**: Basic Auth, with a **SAP user name** field per API (default `ZGATE_POSTMAN`).
- Password is **not** stored in the app. It stays in `middleware\.env` (`SAP_PASSWORD`, or `SAP_PASSWORD_<USER>` for another user). This keeps the password out of the browser, which is a project rule.

### 4. Response
- Read `GateId` from the 201 reply and show it in the success screen with the header and line items SAP returned.
- Log the call in the Scheduler "Recent API Calls" table (status 201, records, time).
- SAP error messages (`error.message`, `SAP__Messages`) shown in the error toast.

## Technical details
- Middleware `sapWrite`: CSRF fetch from the service root with trailing slash (`${servicePath}/`), always Basic Auth, never cookies (cookie code stays but off). Optional `x-sap-csrf: off|on` and `x-sap-user` request headers from the Scripts tab; middleware looks up the matching password in `.env`. Fresh CSRF token per write when cookies are off (SAP ties the token to the session, so a cached token can be rejected with 403 → automatic re-fetch + retry once).
- `SapApi` gets a `scripts?: { csrfFetch: boolean; csrfUrl?: string; authUser?: string }` field saved in `sap_api_configs`; field version bumped.
- `pickConfigured` / payload builder: type conversion (number/date/time) and the item key renames above; unit test asserts the built body equals the Postman payload.
- No real create call from here (it writes a real record in SAP); you test one entry with ngrok running.
