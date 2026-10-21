# Remove DMR screen, rename SAP Gate Entries to "All DMR"

## What changes
- The left menu loses the "DMR" item.
- "SAP Gate Entries" in the menu is renamed "All DMR". The page title becomes "All DMR" too.
- Any link or button that used to open the old DMR screen now opens All DMR. This covers Back links, the Cancel button and what happens after submitting on Create DMR, and DMR detail.

## Technical details
- `AppShell.tsx`: remove the `/dmr` nav item. Relabel `/dmr/sap-gate-entries` as "All DMR".
- `App.tsx`: `/dmr` redirects to `/dmr/sap-gate-entries` with `<Navigate replace>`. Remove the `DMRList` import (the file stays unused, or gets deleted).
- `SapGateEntries.tsx`: PageHeader title becomes "All DMR".
- `DMRNew.tsx` (lines 227 and 251) and `DMRDetail.tsx` (line 37): point to `/dmr/sap-gate-entries`.
