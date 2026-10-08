# Ordisum QA — Phase 03

## Status

FAIL (Critical Logic Flaw in Invitation Flow & RLS)

## Scope

Organization creation, access isolation, roles, permissions, invitations, and team limits.

## Inventory Requirements

1. Verify organization creation and settings management.
2. Verify role-based permissions (owner, admin, manager, analyst, viewer).
3. Verify data isolation across organizations.
4. Verify the invitation flow (generate token, send email, enforce limits).
5. Verify invitation acceptance and role assignment.

## Tests Executed

1. **Test ID 1: Organization Creation**
   - Expected: Organization auto-created upon user signup.
   - Actual: Trigger `handle_first_organization()` properly creates an org if the user has no existing memberships.
   - Status: PASS
   - Evidence: `supabase/migrations/00001_initial_schema.sql` (lines 715-730).

2. **Test ID 2: Organization Settings Protection**
   - Expected: Only `owner` or `admin` can edit organization settings.
   - Actual: `PATCH /api/organization` strictly verifies `CAN_EDIT_ROLES` via `getUserMembership()`.
   - Status: PASS
   - Evidence: `backend/src/routes/organization.js`.

3. **Test ID 3: Cross-Organization Data Isolation (RLS)**
   - Expected: Users can only query data belonging to their organization.
   - Actual: `public.get_user_organization_ids()` correctly scopes data via `organization_id = ANY(...)` in `users`, `api_usage_logs`, `budgets`, etc.
   - Status: PASS
   - Evidence: `00001_initial_schema.sql` (RLS policies).

4. **Test ID 4: Team Member Limits (Edge Function)**
   - Expected: The system rejects invites if the plan limit is reached.
   - Actual: `supabase/functions/invite-user/index.ts` queries the subscription plan's `system_limits` and enforces `team_members` maximum correctly.
   - Status: PASS
   - Evidence: `supabase/functions/invite-user/index.ts` (lines 58-96).

5. **Test ID 5: Invitation Acceptance Flow & Token Handling**
   - Expected: Invited user clicks link, authenticates, and is joined to the target organization.
   - Actual: The feature is completely broken for two compounding reasons:
     1. **Lost Token (Frontend):** `supabase/functions/invite-user/index.ts` sends an email linking to `/auth/signup?token=xyz`. However, `src/pages/auth/SignUp.tsx` completely ignores the `token` URL search parameter. When the user clicks "Sign up with Google", the token is not persisted. The user lands in onboarding and creates a *new* organization for themselves instead of joining the team.
     2. **RLS Blockade (Backend):** Even if the frontend successfully called the `acceptInvitation(token, userId)` method in `src/services/team.ts`, the database RLS policies (`org_members_insert` and `invitations_update`) require the calling user to *already* possess an `owner` or `admin` role in the organization. Because the joining user executes this query and has no role yet, Supabase RLS will outright reject the insertion.
   - Status: **FAIL (Critical Blocker)**
   - Evidence: `src/pages/auth/SignUp.tsx`, `src/services/team.ts`, and `00001_initial_schema.sql` (`org_members_insert` policy).

## Bugs Found

1. **[CRITICAL] Invitation Token Ignored:** `/auth/signup` does not intercept or persist the `token` parameter, effectively stranding invited users in their own isolated organizations instead of joining their team.
2. **[CRITICAL] Invitation Acceptance Blocked by RLS:** `acceptInvitation()` is executed under the new user's session, but RLS on `organization_members` explicitly blocks INSERTs unless the user is already an `owner` or `admin`.

## Manual Verification Required

- **MV-004:** Attempt an end-to-end invitation flow (Invite -> Receive Email -> Click Link -> Sign Up). Confirm that the token is lost and the user fails to join the team.

## Files Changed

None.

## Final Verdict

**FAIL**. The underlying architecture for team management (inviting, limits, checking roles for settings) is mostly secure and correct, but the actual **action of accepting an invitation is functionally impossible** due to missing frontend token handling and misconfigured database RLS policies.

## Next Phase

Pending user decision: Proceed to Phase 4 (Billing, Subscriptions & Entitlements) or fix the invitation blocker first.
