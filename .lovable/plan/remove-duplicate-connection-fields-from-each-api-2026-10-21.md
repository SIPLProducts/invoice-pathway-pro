# Remove duplicate connection fields from each API

You're right. Base URL, Middleware URL, Proxy Secret, SAP Client and the per-API SAP username/password are never used when calling SAP. The middleware URL and secret come from the **Connection & Credentials** tab, and SAP login comes from `middleware/.env`.

## Changes

**Edit API Configuration screen**
- API Details tab: remove the **Base URL** field.
- Settings tab: remove **SAP Client**, **Middleware Port**, **Node.js Middleware URL**, **Proxy Secret**, Connection Mode and Deployment Mode. Show a short note instead: "Connection is managed in SAP API Settings → Connection & Credentials."
- Remove the **Credentials** tab completely (SAP Username, Password, SAP Client).

**Add API dialog**
- Remove the **Base URL** field. The Endpoint Path stays (e.g. `/sap/opu/odata4/...`).

**SAP Sync Monitor**
- Show the endpoint only, without the base URL in front.

**Saved data**
- Old values already saved on each API are left alone and ignored. Nothing breaks, and no data is deleted.
- The SAP password saved earlier in the browser settings is cleared when you next save that API, so it isn't kept in the database.

## Not changed
- The Connection & Credentials tab stays: Middleware URL, Proxy Secret, SAP host and SAP client.
- SAP user and password stay only in `middleware/.env`.

## Technical details
- `src/pages/SAPApiEdit.tsx`: drop the `credentials` tab entry and its content block, the Base URL field, and the middleware/sapClient fields. On save, stop writing `middleware.*`/`credentials`, and strip `credentials.password`.
- `src/components/AddApiDialog.tsx`: remove `baseUrl` from the form; keep the type field optional.
- `src/lib/sapApisStore.ts`: make `baseUrl`, `credentials` and `middleware` optional on `SapApi`.
- `resolveProxyUrl` / `resolveProxySecret` keep their legacy fallback, so nothing changes at runtime.
