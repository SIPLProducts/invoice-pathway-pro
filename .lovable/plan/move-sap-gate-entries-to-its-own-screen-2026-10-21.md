# Move SAP Gate Entries to its own screen

## What changes
- New page **SAP Gate Entries** with the title "All SAP Gate Entries". It shows the same live SAP table that is on the DMR page today: inline line-item edit, header edit dialog, refresh, and the "configure update endpoint" warning.
- The left menu gets a new **SAP Gate Entries** link right below **DMR**. Order: Dashboard, OCR Capture, Create DMR, DMR, SAP Gate Entries, GRN, and so on.
- The **SAP Gate Entries** tab is removed from the DMR list page. DMR keeps the All / Draft / Submitted / Validated / Approved / GRN Posted / Rejected tabs.
- Access follows the existing DMR permission. Anyone who can see DMR can see this page, so no role changes are needed.

## Technical details
- New `src/pages/SapGateEntries.tsx`. Move the API selection logic (liveApis, selectedApi, updateApi, itemUpdateApi, updateNeedsConfig), `SapLiveTable`, `EditHeaderDialog` and refreshKey out of `DMRList.tsx` into it.
- Route `/dmr/sap-gate-entries` in `App.tsx`, guarded with `RequirePermission screen="dmr"`, and declared before `/dmr/:id`.
- `AppShell.tsx`: add a nav item after DMR. Set `end` on the DMR item so it isn't also highlighted on the new page. `/dmr/:id` detail pages will then no longer highlight DMR, which is acceptable.
- `DMRList.tsx`: remove the tab, the tab map entry and the SAP-only code and imports.
