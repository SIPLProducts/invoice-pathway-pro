# Plants / Roles section rename + remove global row

Scoped change to the Create/Edit User modal in `src/pages/admin/UsersTab.tsx`. Nothing else in the form changes — same fields, styling, validation and behaviour.

## Changes

1. **Remove "All plants (global)" completely**
   - Drop the global role row from the modal UI.
   - Remove the `"global"` key handling in form state (`roleByPlant`), in edit prefill (`r.plant_id ?? "global"`), and in the submit payload branch that maps `"global"` to `plant_id: null`.
   - Every role assignment is now plant-specific.

2. **Rename section heading "Plant Assignment" → "Plants"**

3. **Rename section heading "Role Assignment" → "Roles"**

4. **Keep Plants on the LEFT and Roles on the RIGHT** in the existing two-column layout.

## Out of scope

- No other field, label, layout, spacing, colour, validation or backend change.

## Files

- `src/pages/admin/UsersTab.tsx` (only)
