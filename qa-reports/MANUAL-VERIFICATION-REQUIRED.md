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
- **MV-014:** Manually create a budget with `alert_at_50=true` and `hard_limit=true`. Trigger enough traffic through the playground to cross 50% of the budget. Confirm: (a) an alert row appears in the dashboard, (b) a budget alert email arrives, and (c) once the hard limit is hit, gateway calls return `403`.

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
- **MV-022**: Run `npm run build` locally to verify the production build succeeds after the TypeScript fix.
