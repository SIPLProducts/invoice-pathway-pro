# Create User modal — simplified fields

Update the existing Create User modal only. No new page, no theme/styling changes.

## User Details (single section)
Fields, in order: First Name (required), Last Name (Optional), Contact (required), Password (required), Confirm Password (required), Status (required dropdown: Active / Inactive, default Active).

Removed from the form: User ID / SAP User ID field and Email field. No new fields added.

## Plant & Role Assignment
One row, two equal-width columns:

```text
[ Plant Assignment            ] [ Role Assignment              ]
 [x] 1000 - Main Plant           1000 - Main Plant  [Role v]
 [ ] 2000 - Secondary Plant      2000 - Secondary   [Role v]
 3 plants selected
```

- Left: checkbox list of plants showing "code - name", with a selected-count line.
- Right: one row per selected plant with a Role dropdown; unchecking a plant removes its role row and assignment.

## Validation
First Name, Contact, Password, Confirm Password required; Confirm must match Password; at least one plant selected; every selected plant must have a role. Inline messages under each field, same style as today.

## Buttons
Unchanged: Cancel | Create User, bottom-right.

## Technical notes
- Login identity: the auth backend still needs a unique login identifier, but it will no longer be typed by the admin. On create, the app auto-generates the internal user code (the existing auto-generated USER_ID) and derives a hidden internal email `<user_code>@siplusers.internal` used only for the auth account. Admins never see it; users sign in with their auto-generated User ID plus password. The generated User ID stays visible in the users table so it can be shared with the user.
- `src/pages/admin/UsersTab.tsx`: drop `sap_user_id` and `email` from form state, validation and JSX; keep the existing `Field`, `Input`, `Select`, checkbox and popover components and classes; restructure the plant/role block into a 2-column grid.
- `supabase/functions/admin-users/index.ts`: make `sap_user_id` and `email` optional in the create/update payloads; when absent, generate the user code server-side and derive the internal email. Existing users and the master admin account keep working unchanged.
