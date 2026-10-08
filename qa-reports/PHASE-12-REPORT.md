# Ordisum QA — Phase 12

## Status

PASS WITH DOCUMENTED LIMITATION (pre-existing UI stub)

## Scope

Organization Settings (`GET/PATCH /api/organization`), User Profile (`GET/PATCH/PUT /api/profile`), Avatar & Logo Upload, Access Control (`GET /api/organization/access`), Platform Admin Panel (`requirePlatformAdmin`, `requireSuperAdmin`, admin sub-router), Admin Permission Catalog.

## Inventory Requirements

1. Verify organization PATCH uses a strict field whitelist (no mass-assignment).
2. Verify profile PATCH uses a strict field whitelist (no elevation of `is_active`, `is_platform_admin`).
3. Verify avatar/logo update never accepts raw image data — only uploaded URL.
4. Verify `GET /api/organization/access` correctly computes trial vs. subscription access.
5. Verify `requirePlatformAdmin` middleware gates all `/api/admin/*` routes.
6. Verify `requireSuperAdmin` is a second gate for admin management routes.
7. Verify audit logging exists on destructive admin actions (promote/demote).

## Tests Executed

1. **Test ID 1: Organization Settings — Field Whitelist**
   - Expected: A `PATCH /api/organization` with `{ is_active: false }` must be silently ignored.
   - Actual: `EDITABLE_ORG_FIELDS` is an explicit allowlist of 10 fields (`name`, `website`, `industry`, etc.). The update loop uses `Object.prototype.hasOwnProperty.call(req.body, field)` to only copy whitelisted keys — any extra field in `req.body` is never written. An empty resulting `updates` object returns `400`.
   - Status: PASS
   - Evidence: `organization.js` (lines 40, 70-79).

2. **Test ID 2: Profile — Anti-Elevation Whitelist**
   - Expected: A `PATCH /api/profile` with `{ is_platform_admin: true }` must never elevate the user.
   - Actual: `EDITABLE_USER_FIELDS` is limited to `['full_name', 'job_title', 'phone_number', 'timezone', 'language']`. The same safe copy pattern prevents `is_active`, `is_platform_admin`, `admin_role` from ever being written via this endpoint. `avatar_url` is also excluded — it requires the separate `/profile/avatar` endpoint, which is only set server-side after a verified Supabase Storage upload.
   - Status: PASS
   - Evidence: `profile.js` (lines 33-35, 112-118).

3. **Test ID 3: Avatar / Logo Upload Safety**
   - Expected: Avatar must not accept a raw base64 data URL (would bloat the `users` table).
   - Actual: `POST /api/profile/avatar` accepts only a `string` URL. The comment at line 172-176 explicitly documents that the old base64 behavior was removed. Logo upload follows the same pattern. Neither endpoint accepts binary data.
   - Status: PASS
   - Evidence: `profile.js` (lines 177-197), `organization.js` (lines 98-123).

4. **Test ID 4: Organization Access — Trial vs. Subscription Logic**
   - Expected: A cancelled subscription still in its billing period must grant access.
   - Actual: `GET /api/organization/access` checks in this order:
     1. Active/trialing/`past_due` subscription → `hasAccess: true`
     2. `cancelled` status with `cancelled_at` in the future → `hasAccess: true` (grace period)
     3. Trial: checks `trial_ends_at > now()` → `hasAccess: true` with `daysLeft`
     4. All else → `hasAccess: false, source: 'none'`
   - Status: PASS
   - Evidence: `organization.js` (lines 130-187).

5. **Test ID 5: Admin Panel — `requirePlatformAdmin` Gate**
   - Expected: Every `/api/admin/*` request must be blocked for non-admin users.
   - Actual: `requirePlatformAdmin` is applied via `router.use(requirePlatformAdmin)` in `admin/index.js` — **a single authoritative middleware call** before any sub-router is mounted. It reads `users.is_platform_admin` from the database (not trusting JWT claims). If the DB query fails, returns `500` rather than allowing through.
   - Status: PASS
   - Evidence: `admin/index.js` (line 35), `requirePlatformAdmin.js` (lines 14-35).

6. **Test ID 6: Super Admin — Second Gate for Admin Management**
   - Expected: Only `super_admin` role users should be able to promote/demote other admins.
   - Actual: `admin/admins.js` applies `requireSuperAdmin` middleware via `router.use(requireSuperAdmin)` at the top of the file — on top of the already-applied `requirePlatformAdmin` from the parent. Super admin promote/demote actions insert rows into `audit_logs` with `action`, `target_user_id`, and `performed_by`.
   - Status: PASS
   - Evidence: `admin/admins.js` (lines 9-26, 100+).

7. **Test ID 7: Data & Privacy Settings — Schema Gap**
   - Expected: Data retention, anonymization, and benchmark-sharing toggles on the Organization Settings page should persist.
   - Actual: Code comment in `organization.js` (lines 36-39) explicitly flags that these UI toggles have **no backing columns in the live database schema**. The `EDITABLE_ORG_FIELDS` whitelist correctly excludes them, preventing phantom writes, but their values will never actually be saved.
   - Status: KNOWN LIMITATION (not a regression — documented as pre-existing)
   - Evidence: `organization.js` (lines 33-40).

## Bugs Found

None (regression bugs).

## Known Limitations (Pre-Existing)

- **Data & Privacy Settings UI Stubs:** The "Data & Privacy" section in Organization Settings (data retention, anonymize cost data, share benchmarks, allow third-party processing) has no backing schema columns. These toggles do nothing. Requires a schema migration before they can be wired up.

## Manual Verification Required

- **MV-018:** Log in as a non-admin user. Attempt to `PATCH /api/admin/users` directly with a valid JWT. Confirm `403 Admin access required` is returned.
- **MV-019:** Confirm that "Data & Privacy" toggles in Organization Settings show the limitation to the user or are hidden, rather than silently pretending to save.

## Files Changed

None.

## Final Verdict

**PASS WITH DOCUMENTED LIMITATION**. The organization and profile update endpoints are correctly field-whitelisted, preventing mass-assignment and privilege escalation entirely. The admin panel uses a layered two-gate middleware pattern (`requirePlatformAdmin` → `requireSuperAdmin`) that is clean, documented, and single-sourced. The only gap is a pre-existing UI stub for Data & Privacy settings that has no schema backing.

## Next Phase

Proceed to Phase 13 (Webhooks & Billing Webhooks).
