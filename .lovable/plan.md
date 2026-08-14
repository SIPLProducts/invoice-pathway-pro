# Update Create/Edit User modal

Refactor the existing user modal in `src/pages/admin/UsersTab.tsx` so the form fields and plant/role layout match the new requirements. No new page, no color/spacing overhaul.

## User Details changes

- Rename label **SAP User ID** → **User ID** everywhere it appears in this modal (and update the users table header/search placeholder for consistency).
- **First Name** stays required.
- **Last Name** becomes optional, label shown as **Last Name (Optional)**.
- **Remove the Email field** from the UI.
  - Supabase Auth still needs an email, so the backend will auto-generate a hidden internal address from the User ID (`{sanitized_user_id}@siplusers.internal`).
  - Login continues to work with `resolve_login_email`, which already matches `sap_user_id`.
- **Contact** stays required with the existing phone pattern.
- **Password / Confirm Password** keep show/hide toggles.
  - Required on create; on edit they remain optional but must match if either is filled.
- **Status** dropdown stays, default `Active`.

## Plant & Role Assignment layout

Replace the current stacked Plant + Role sections with a side-by-side two-column layout on medium screens and up:

```text
+----------------------------+----------------------------+
|  Plant Assignment          |  Role Assignment           |
|  [Select plants dropdown]  |  1000 - Main Plant     [v] |
|  2 plant(s) selected       |  2000 - Secondary Plant[v] |
|  [chip] [chip]             |                            |
+----------------------------+----------------------------+
```

- **Plant Assignment (left)**
  - Keep the existing popover multi-select with checkboxes.
  - Show plant code and name, e.g. `1000 - Main Plant`.
  - Display the selected count and removable chips.
  - Removing a plant clears its role from the right side.

- **Role Assignment (right)**
  - Heading: **Role Assignment**.
  - List each selected plant with its own Role dropdown.
  - Remove the current global "All plants" row so every assignment is plant-specific.
  - If no plant is selected, show the existing hint: "Please select a plant and assign a role for each plant."

## Validation

- User ID, First Name, Contact, Password, Confirm Password required (on create).
- Last Name optional.
- Confirm Password must match Password.
- At least one plant must be selected.
- Every selected plant must have a role assigned.
- User ID uniqueness is enforced by the backend; duplicate responses surface as a form-level error.

## Backend change

`supabase/functions/admin-users/index.ts`:
- Make `email` optional in `create_user` / `update_user` payloads.
- When missing, derive it from `sap_user_id` using a stable internal domain.
- Keep the duplicate check against `sap_user_id` and the derived `email`.
- Return a user-facing message: "User ID already exists" instead of "Email or SAP User ID already exists".

## Files to edit

- `src/pages/admin/UsersTab.tsx` — form state, validation, modal JSX, table header/search placeholder.
- `supabase/functions/admin-users/index.ts` — optional email handling and duplicate message.
- Optionally `src/pages/Login.tsx` — replace "SAP User ID" label/placeholder with "User ID" for consistency (one-line text change).

## Out of scope

- No database schema changes; `profiles.email` and `sap_user_id` columns stay as-is.
- No changes to roles, permissions, or the users list beyond the SAP → User ID relabel.
