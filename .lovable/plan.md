## Goal
Turn the existing cosmetic `/login` page into a working demo-only login with one-click demo user sign-in. No backend — session lives in `localStorage`.

## 1. Demo auth utility — `src/lib/demoAuth.ts` (new)
- Define 4 demo users matching the existing role model (`site`, `accounts`, `management`, `admin`):
  - **Anil Kumar** — Site Engineer — `anil.kumar@rithwik.com` / `site@123` — initials `AK`, site `BLR-01`
  - **Priya Sharma** — Accounts (HO) — `priya.sharma@rithwik.com` / `accounts@123` — initials `PS`, dept `Finance`
  - **Rajesh Menon** — Management — `rajesh.menon@rithwik.com` / `mgmt@123` — initials `RM`, dept `Operations`
  - **System Admin** — Admin — `admin@rithwik.com` / `admin@123` — initials `SA`, dept `IT`
- Export `DEMO_USERS`, `getCurrentUser()`, `signIn(email, password)`, `signOut()`, and a `useCurrentUser()` hook (via `useSyncExternalStore`) so the AppShell re-renders on login/logout.
- Storage key: `dmr.auth.user` (JSON of the matched user, no password stored).

## 2. Login page — `src/pages/Login.tsx` (edit)
- Keep current premium left/right layout & styling.
- Wire `onSubmit` to `signIn(email, password)`; on success `navigate("/", { replace: true })`, on failure show toast.
- Add a **"Demo accounts"** panel under the form (collapsible on mobile) listing the 4 users as clickable cards:
  - Each card shows name, role chip, email, and a small "Use" button.
  - Click → auto-fills email + password fields and immediately signs in.
- Show passwords inline (this is a demo) with a small "Click to copy" affordance.
- If already signed in on mount, redirect to `/`.

## 3. Route protection — `src/App.tsx` (edit)
- Add a tiny `RequireAuth` wrapper component (in `src/components/RequireAuth.tsx`, new) that reads `getCurrentUser()` and `<Navigate to="/login" replace />` if absent.
- Wrap the `<AppShell />` route element with `RequireAuth` so every protected page requires login. `/login` and `*` (NotFound) stay public.

## 4. AppShell integration — `src/components/AppShell.tsx` (edit)
- Replace the hard-coded "AK / Anil Kumar / Site Engineer · BLR-01" header block with values from `useCurrentUser()` (initials, name, role label, location/dept).
- Wire the **"Sign out"** dropdown item to call `signOut()` then `navigate("/login", { replace: true })`.
- The "Switch role (demo)" items become functional shortcuts: clicking one signs in as that role's demo user without leaving the app (handy for testing flows).

## 5. Small polish
- Add a `roleLabel` map for nice display strings ("Site Engineer", "Accounts (HO)", "Management", "System Admin").
- Toast on successful sign-in / sign-out using the existing `sonner` toaster.

## Files touched
- **New:** `src/lib/demoAuth.ts`, `src/components/RequireAuth.tsx`
- **Edit:** `src/pages/Login.tsx`, `src/App.tsx`, `src/components/AppShell.tsx`

## Out of scope (call out)
- No real backend, no password hashing, no email verification — purely a front-end demo gate. If you later want real accounts (with Supabase auth, password reset, Google sign-in, RLS-protected data), say the word and we'll upgrade in a follow-up.