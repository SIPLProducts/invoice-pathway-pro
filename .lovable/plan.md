# User Management + RBAC Module

A production-ready access-control module: real cloud accounts, plant-scoped roles, and screen-level permissions stored in the database (never hardcoded in the frontend).

## Access model

```text
User -> Plant -> Role -> Screen Permissions
```

A user can hold a different role in each plant. Effective permissions = union of permissions from the roles the user holds. Super Admin bypasses all checks.

## Sign-in changes

- Real email/password sign-in replaces the demo login and the "switch role (demo)" menu.
- Admin-created users get a real account and can sign in immediately (no email confirmation step).
- `masteradmin@sharviinfotech.com` is seeded as Super Admin with the "Sharvi Admin" role and cannot be deleted, deactivated, or stripped of its role by the UI or the database.
- Password reset by email is included (forgot-password + reset page).

## Admin screen: three tabs at `/admin/users`

### 1. Users
Table columns: SAP User ID, Name, Email, Contact, Status, Plants, Roles, Last Login, Actions.
- Filters: search, status, plant, role. Toggle to show deleted users.
- Create/Edit dialog: SAP User ID, Name, Email, Contact, Password (create only / optional reset on edit), Status, plant multi-select, and a role picker per selected plant.
- USER_ID is auto-generated (`USR-00001` style, sequential).
- Delete offers Temporary (soft — user is blocked from signing in, row stays with a Restore action) or Permanent (removes the account and all assignments).
- Validation: duplicate email, duplicate SAP User ID, duplicate plant+role combination.

### 2. Roles
- Table: Role Name, Description, Status, users assigned, Actions.
- Create / Edit / Delete; delete is blocked with a clear message when the role is assigned to any user.
- "Sharvi Admin" ships as the default system role and is protected from deletion.

### 3. Screen Permissions
- Matrix: rows = screens, columns = View / Create / Edit / Delete / Approve, with a role selector at the top.
- Seeded screens: Dashboard, DMR, Gate Entries, GRN, SAP Tracker, SAP Module, Approvals, Documents, Reports, User Management, Role Management.
- Checkbox changes save to the database; Super Admin's matrix is read-only (always full access).

## Enforcement

- Sidebar renders only screens the signed-in user can View.
- Direct URLs to disallowed screens show a "No access" page instead of the content.
- Action buttons (create/edit/delete/approve) are hidden or disabled without the matching permission.
- The database enforces the same rules independently, so a modified frontend cannot read or write data the user isn't entitled to.

## Technical notes

Tables (all with `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` soft-delete):
`profiles` (user_id code, sap_user_id, name, email, contact, status, last_login_at), `plants`, `roles`, `screens`, `user_plants`, `user_roles` (user + plant + role, unique), `screen_permissions` (role + screen + can_view/create/edit/delete/approve, unique).

- `user_roles` stays a separate table — roles are never stored on `profiles`.
- Security-definer helpers: `is_super_admin(uid)`, `has_permission(uid, screen_key, action)`; all RLS policies call these to avoid recursion.
- GRANTs issued for `authenticated` (and `service_role`) on every new table; no `anon` access.
- Admin user creation/deletion runs through an edge function using the service role (creating auth accounts requires it), which itself verifies the caller is a Super Admin or holds User Management create/delete rights.
- New client pieces: `useAuth` (session + profile), `usePermissions` (effective permission map + `can(screen, action)`), `RequirePermission` route guard; `RequireAuth`, `AppShell`, and `Login` are rewritten against real auth; `src/lib/demoAuth.ts` is removed.
- Plants are managed manually in the plants table (a small plants editor is included inside the Users tab area).

## Out of scope

Existing SAP/DMR pages keep their current behaviour apart from the sidebar/route gating and the action-level permission checks.
