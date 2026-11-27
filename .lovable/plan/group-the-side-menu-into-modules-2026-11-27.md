# Group the side menu into modules

## What changes
The side menu gets three collapsible groups, like the existing "SAP Module" group:

```text
Dashboard
DMR ▾
   OCR Capture
   Create DMR
   Update DMR
   All DMR
GRN ▾
   Create GRN
   GRN
Service Entry Sheet ▾      (new)
   Create SES
SAP Tracker
SAP Module ▾
Approvals / Documents / Reports / User Management
```

- A group opens automatically when you are on one of its screens.
- Who sees which item stays the same as today (DMR, GRN permissions).
- **Create SES** opens a new page at `/ses/new` with a simple starting layout (title "Create Service Entry Sheet") ready for fields and the SAP API once you share them. It uses the GRN permission for now.

## Technical details
- `src/components/AppShell.tsx`: generalize the group type (label, icon, children, per-child `screen`, path prefixes for active/auto-open) and render all groups with the existing SAP group code; hide a group when no child is permitted.
- New `src/pages/SESCreate.tsx` placeholder using `PageHeader`; route in `src/App.tsx` wrapped in `RequirePermission screen="grn"`.
