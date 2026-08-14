# Create User form: fields, plant/role assignment, validation

Update the existing Create/Edit user modal in User Management. Same modal, same spacing, colors, buttons and responsive grid — only fields, assignment UI and validation change.

## User Information

Two-column grid as today:

- SAP User ID (required, unique)
- First Name (required)
- Last Name (required)
- Email (required, valid, unique — kept visible since sign-in needs it)
- Contact (phone input, required, valid phone number)
- Password / Confirm Password (required on create, must match; on edit both optional but must match if filled) — each with a show/hide eye toggle
- Status — dropdown Active / Inactive, defaults to Active

First and Last Name are combined into the single stored name ("First Last") and split back apart when opening an existing user for editing.

## Plant Assignment

Replaces the current checkbox grid with a multi-select dropdown:

- "Select one or more plants" trigger, checkbox list of plants inside
- Selected plants shown as removable chips ("1000 - Main Plant  x") under the trigger
- Removing a plant also clears the role assigned to it

## Role Assignment

- Roles — multi-select of the roles this user may hold; shown as removable chips
- Role — per-plant assignment: for each selected plant, a dropdown limited to the roles chosen above, so the admin sets one role per plant
- When no plant is selected yet, show the existing hint line: "Please select a plant and assign a role for each plant."
- The global "All plants" role row stays available for account-wide roles (used by the master admin)

## Validation (blocking, with inline messages)

- SAP User ID, First Name, Last Name, Email, Contact required
- Contact must match a valid phone pattern (digits, optional +, 8-15 digits)
- Password min 8 chars on create; Confirm must match
- At least one plant selected
- Every selected plant must have a role assigned
- No duplicate plant + role pair
- Uniqueness of SAP User ID / Email stays enforced by the backend, surfaced as a form error

## Technical notes

- Only `src/pages/admin/UsersTab.tsx` changes. Form state gains `first_name`, `last_name`, `confirm_password`, `role_ids`; `name` is derived on submit.
- Validation via a zod schema with field-level errors rendered under each input.
- Payload sent to the existing `admin-users` edge function is unchanged in shape (name, email, plant_ids, roles pairs) — no database or backend changes needed.
