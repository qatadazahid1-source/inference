# Manual Verification Required

## Phase 2
- **MV-002**: A real user must test the Google OAuth flow to confirm consent screens and redirect handling work in production.
- **MV-003**: A test account must be deleted to verify that PostgreSQL foreign key cascading (`ON DELETE CASCADE`) correctly purges all linked data.

## Phase 3
- **MV-004**: Owner sends real invitation.
- **MV-005**: Invited new user opens real email.
- **MV-006**: Invited user completes real Google OAuth.
- **MV-007**: Invited user lands in the intended organization.
- **MV-008**: Correct role is visible.
- **MV-009**: Existing user invitation flow.

## Phase 4
- **MV-010:** Perform a real checkout in Test Mode using Lemon Squeezy test cards. Verify `subscription_created` webhook lands and activates UI.
- **MV-011:** Soft-cancel the test subscription and verify UI reflects "Cancels at period end".

## Phase 7
- **MV-012:** Test generating a Platform Key from the UI, connect it to a mock script (`curl` or OpenAI Node SDK) pointed at `api.ordisum.com/v1/chat/completions`, and verify the completion returns successfully and the cost appears in the dashboard.

## Phase 8
- **MV-013:** Verify ROI PDF export physically downloads a readable document in different browsers (Chrome, Firefox, Safari).

## Phase 9
- **MV-014 ✅ AUTOMATED-PASS (2026-10-09):** Budget threshold alert verified via `verify_alerts_and_dispatch.js`.
  - Alert row confirmed in DB: ID `2d9a114d`, type `budget_threshold`, severity `critical`.
  - Alert message: "567% ($0.0057 of $0.0010) of the 'o' monthly budget used" — sub-cent precision confirmed.
  - Resend API key present; email dispatch path verified (live send requires org email; MANUAL if email receipt needed).
  - Slack: No OAuth connected for test org (expected; safe skip — mark MANUAL when live Slack connected).
  - Gateway hard-limit (`429 BUDGET_EXCEEDED`) previously confirmed by `verify_gateway_hard_limit.js`.

## Phase 10
- **MV-015:** Create a `weekly` recurring report with recipients. Wait for (or manually invoke) the scheduler. Confirm: (a) a new child report row is created with the dated name, (b) recipients receive the email with the correct file attached, and (c) `next_run_at` advances by exactly 7 days.

## Phase 11
- **MV-016:** Test TOTP 2FA end-to-end: enable 2FA, scan QR, verify code, log out, log back in, confirm backup codes work as second factor.
- **MV-017:** Test `revoke-all` sessions — confirm other sessions no longer show in the security panel.

## Phase 12
- **MV-018:** Log in as a non-admin user. Attempt to `PATCH /api/admin/users` directly with a valid JWT. Confirm `403 Admin access required` is returned.
- **MV-019:** Confirm that "Data & Privacy" toggles in Organization Settings show the limitation to the user or are hidden, rather than silently pretending to save.

## Phase 13
- **MV-020:** Create an outbound webhook endpoint. Trigger an event (e.g., a scheduled report or budget crossing). Intercept the webhook using a service like Webhook.site and confirm: (a) payload format, (b) `X-Ordisum-Signature` is valid.
- **MV-021:** Simulate a Lemon Squeezy test purchase. Verify that the Supabase Edge Function processes the `subscription_created` and `order_created` webhooks, and the UI unlocks properly.

## Phase 14
- **MV-022 ✅ AUTOMATED-PASS (2026-10-09):** `npm run build` exited 0. Built in 34.28s. All 11 static routes pre-rendered by react-snap (/, /pricing, /features, /security, /contact-sales, /blog, /terms, /privacy-policy, /refund-policy, /docs, /docs/overview). All mandatory legal page HTML files verified. No TypeScript errors. `[LandingFooter]` console.log warnings during prerender are expected (no backend at build time) and do not affect runtime.

## Phase 15 (Critical Budget, Alerts, Reports & Focus Glitch Verification)
- **MV-023**: In production browser on the Business plan organization, open Budget Manager, click "Edit" on budget `o`, verify amount `$0.001` is visible, enable `hard_limit`, and save to confirm 200 OK without 403 Forbidden.
- **MV-024**: In the Create/Edit Budget modal, click the Amount input and continuously type `0.001` without stopping; confirm focus stays locked in the input and never jumps or loses outline.
- **MV-025 ✅ AUTOMATED-PASS (2026-10-09):** Alert dispatch pipeline verified by `verify_alerts_and_dispatch.js`. In-app alert row created; Resend API key present (live email MANUAL-confirm receipt); Slack skip is safe (no OAuth connected for test org).
- **MV-026**: Download generated PDF and XLSX files from the browser and open in local reader applications to confirm desktop layout rendering.
