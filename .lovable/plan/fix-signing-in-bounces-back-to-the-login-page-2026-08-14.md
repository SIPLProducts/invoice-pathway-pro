# Fix: signing in bounces back to the login page

## What I verified

I signed in as `sharvi` against the running app and it worked: the session was stored, the dashboard rendered, and the session was still valid a minute later. So the bug is not a plain "credentials rejected" problem — something drops the session shortly after sign-in on your browsers.

The auth server logs show the likely trigger: dozens of session-refresh calls firing in the same second from the app (both the preview host and dmr2grn.siplproducts.com), with some rejected as `429 Request rate limit reached`. Every successful refresh revokes the previous refresh token, so any request that loses that race ends up with a dead token. The auth client then reports a signed-out state, and the route guard immediately sends you back to `/login` — exactly the "dashboard flashes, then login" behaviour.

The root cause of the refresh storm is not yet confirmed (multiple open tabs, a stale cached bundle from the published service worker, and repeated guard re-mounts are all candidates), so the plan both hardens the app against it and adds the logging needed to confirm it.

## Plan

### 1. Stop the guard from ejecting on a transient empty session
- `src/components/RequireAuth.tsx`: once a session has been seen, don't redirect on a momentary null. Redirect to `/login` only after an explicit sign-out or a confirmed unauthenticated state, and show the loading state otherwise.

### 2. Make the auth context tolerant of refresh hiccups
- `src/lib/auth.tsx`:
  - Only clear profile/roles/permissions on a real `SIGNED_OUT` event, not on every event with a temporarily missing session.
  - Skip reloading profile/roles on `TOKEN_REFRESHED` when the user id is unchanged (this removes a burst of database calls after every refresh).
  - If a refresh fails with a rate-limit/network error, retry with a short backoff and re-check the session before treating the user as signed out.

### 3. Remove duplicate session work at startup
- Rely on the single `onAuthStateChange` subscription for the initial session instead of also racing `getSession()`, so one page load makes one session call rather than two.

### 4. Prevent stale published bundles
- Adjust the service-worker registration so navigation/HTML requests are served network-first and a new version activates immediately. This ensures the published site and custom domain always run the current auth code instead of a cached older build.

### 5. Diagnostics so we can confirm the cause
- Add a small, temporary console trace of auth events (event name + whether a session exists + redirect reason). If it still bounces after the fixes, the browser console will show exactly which event caused it, and we remove the logging once confirmed.

### 6. Verification
- Sign in as `sharvi` in the sandbox, stay on the dashboard, hard-refresh, and confirm the session survives.
- Then publish and re-test on dmr2grn.siplproducts.com, including a hard reload to clear the old service worker.

## Notes
- Nothing in the database, roles, or permissions changes; this is client-side session handling plus the service-worker caching rule.
- If the console trace later shows the storm comes from several tabs open at once, the follow-up is to serialize refreshes across tabs, which the above logging will tell us.
