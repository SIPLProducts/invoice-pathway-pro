# SAP connection: switch to plain Basic Auth (no cookies)

## Goal
SAP now works with only the URL + Basic Auth (user/password) on every request, as in Postman. Stop all cookie/session logic and read Gate Entries from the new endpoint.

New endpoint (GET):
`https://1f674db9-07aa-4869-885b-435d1624cc4c.abap.us10.hana.ondemand.com/sap/opu/odata4/sap/zsb_gate_entry_o4/srvd_a2x/sap/zsd_gate_entry/0001/GateHeader`

## Changes
1. **Middleware - stop using cookies (code kept, just switched off)**
   - Every SAP call sends `Authorization: Basic <user:password>` only. No login call, no JSESSIONID/__VCAP_ID__ cookies sent, no "session expired / auto re-login" retry.
   - Existing cookie/session code and comments stay in the files; they are simply bypassed (stateless Basic becomes the default for `SAP_AUTH_MODE=basic`). Nothing is deleted.
   - Proxy-secret check, logging and error mapping unchanged.
2. **SAP API Settings (web app)**
   - Update the Gate Entry header endpoint to the new URL above (base host changes, `srvd` -> `srvd_a2x`, entity `GateHeader`). Hide any cookie/session fields or "SAP session" status on the screens (not deleted).
3. **Gate Entry data mapping**
   - Map the new response fields (GateId, Plant, GateDate, GateTime, Vendor, VendorName, VehicleNo, DriverName, InvoiceNo, InvoiceDate, EwayBillNo, weights, GST amounts, TotalAmount, etc.) to the existing SAP Gate Entries list and DMR auto-fill. Ignore `SAP__Messages`.
   - The new response has no items inside the header, so no `$expand=_Item` is sent unless an item endpoint is configured.
4. **Credentials**
   - The user `ZGATE_POSTMAN` and its password go only into the server's `middleware/.env` (`SAP_BASE_URL`, `SAP_USER`, `SAP_PASSWORD`), never into the app or the database. I will give the exact `.env` lines and restart command for the Ubuntu server.

## Verification
- Middleware test with a mock SAP server: request carries Basic auth header and no Cookie header; JSON list returned and mapped.
- Existing app tests still pass.

## Note
Please change that password after setup, since it was shared in a screenshot.
