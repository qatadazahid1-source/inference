# Bugs Found & Fixed

## Phase 1
- `npm run typecheck` failed: TypeScript error in `AdminLandingPricing.tsx` (missing `hard_budget_enforcement` key).
- `npm run lint` failed: `eslint` missing from dependencies.

## Phase 2
- **Warning (Architectural Limitation)**: The `track-login` endpoint marks the newly-created session row as the only `is_current = true` row for the user. If a user logs in on two devices, it overwrites `is_current` rather than maintaining distinct sessions.

## Phase 3
- **[CRITICAL - FIXED] Invitation Token Ignored:** `/auth/signup` did not intercept or persist the `token` parameter, effectively stranding invited users in their own isolated organizations instead of joining their team. (Fixed by tracking in localStorage).
- **[CRITICAL - FIXED] Invitation Acceptance Blocked by RLS:** `acceptInvitation()` was executed under the new user's session, but RLS on `organization_members` explicitly blocked INSERTs unless the user was already an `owner` or `admin`. (Fixed by migrating acceptance to a `SECURITY DEFINER` Postgres RPC).
