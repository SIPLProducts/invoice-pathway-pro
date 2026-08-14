# Simplify the Create/Edit User modal

Rework the modal in `src/pages/admin/UsersTab.tsx` only — same design, colors, fonts, spacing and buttons.

## User Details (2-column grid, unchanged styling)

```text
First Name*        | Last Name (Optional)
Contact*           | Password*
Confirm Password*  | Status (Active / Inactive)
```

- Remove the **SAP User ID** field and the **Email** field from the form. No identifier field is shown.
- Last Name label becomes "Last Name (Optional)" and is no longer validated.
- Password / Confirm Password keep the eye toggles; required on create, optional on edit but must match if filled.

## Plants and Roles — side by side

Replace the two stacked sections with one `sm:grid-cols-2` row, equal width, same section styling:

```text
+---------------------------+---------------------------+
| Plants *                  | Roles *                   |
| [Select one or more…  v]  | [Select one or more…  v]  |
| 1000 - Main Plant   [x]   | Admin              [x]    |
| 2000 - Secondary    [x]   | Approver           [x]    |
+---------------------------+---------------------------+
```

- **Plants (left)** — heading "Plants". Existing popover checkbox multi-select showing `code - name`, selected plants shown as removable chips.
- **Roles (right)** — heading "Roles". Same popover checkbox multi-select of roles, selected roles as removable chips.
- **Remove entirely**: the "All plants (global)" row, the per-plant role dropdown box, and the "Please select a plant and assign a role for each plant" hint. No global-plant UI remains anywhere in the modal.

## Validation

- First Name, Contact required; Password + matching Confirm required on create.
- At least one plant selected; at least one role selected.
- No per-plant role check anymore.

## Identifier handling (technical)

The backend (`admin-users`) still requires a unique `sap_user_id` and an auth email, so with both fields removed from the UI the client generates them silently on create:

- `user_id` = sanitized first+last name plus a short random suffix (e.g. `johnsmith4821`), guaranteed unique against the loaded users list.
- `email` = `{user_id}@siplusers.internal`.
- Role rows sent to the backend = every selected role applied to every selected plant (`plant_id` never null), so no global rows are created.
- On edit, the existing `sap_user_id` / `email` are preserved as-is.

Existing users keep their current IDs; the Users table still shows them so an admin can read a user's login ID.

## Files

- `src/pages/admin/UsersTab.tsx` — form state, validation, modal JSX.
- No backend, schema, or styling changes.
