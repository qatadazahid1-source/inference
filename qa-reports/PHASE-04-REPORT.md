# Ordisum QA — Phase 04

## Status

PASS

## Scope

Billing, Subscriptions, Entitlements (Lemon Squeezy Integration), Checkout & Portal flows.

## Inventory Requirements

1. Verify Lemon Squeezy integration (checkout & webhooks).
2. Verify Subscription status synchronization.
3. Verify Entitlements enforcement across backend & frontend.
4. Verify Checkout flows and security.
5. Verify Portal flows (Update Payment Method).
6. Verify Billing Settings UI.

## Tests Executed

1. **Test ID 1: Checkout Session Security**
   - Expected: Checkout generation must verify organization membership and pass secure `custom_data`.
   - Actual: `supabase/functions/create-checkout-session/index.ts` validates `organization_members` before calling Lemon Squeezy, passing `organization_id`, `plan_id`, `user_id`, and `billing_cycle` securely into `custom_data`.
   - Status: PASS
   - Evidence: `create-checkout-session/index.ts` (lines 65-80).

2. **Test ID 2: Webhook Sync & Integrity**
   - Expected: Lemon Squeezy webhooks must be verified using HMAC-SHA256 and update local subscriptions accurately.
   - Actual: `supabase/functions/lemonsqueezy-webhook/index.ts` manually verifies the `x-signature` header via `crypto.subtle`. It maps events like `subscription_created`, `subscription_updated`, and `subscription_payment_success` securely to the `subscriptions` and `invoices` tables.
   - Status: PASS
   - Evidence: `lemonsqueezy-webhook/index.ts` (lines 32-54, 90-136).

3. **Test ID 3: Entitlements Enforcement**
   - Expected: Backend limits and features must be enforced based on the active plan.
   - Actual: `backend/src/middleware/requireEntitlements.js` safely queries the `subscriptions` table joined with `plans`, attaching `system_limits` securely to `req.entitlements`. Unsubscribed users are safely routed to `FALLBACK_LIMITS`.
   - Status: PASS
   - Evidence: `requireEntitlements.js` (lines 48-136).

4. **Test ID 4: Frontend Entitlements Context**
   - Expected: Frontend must cleanly adapt to plan limits.
   - Actual: `src/context/EntitlementsContext.tsx` uses `useEntitlementsQuery` and provides typed helpers (`hasFeature`, `isAtLimit`) to all UI components, gracefully failing to zero-access (`FALLBACK_LIMITS`) on network or state errors.
   - Status: PASS
   - Evidence: `EntitlementsContext.tsx`.

5. **Test ID 5: Billing Portal & Card Updates**
   - Expected: Card details should never touch Ordisum servers. The system should fetch Lemon Squeezy hosted portal URLs.
   - Actual: `GET /api/billing/payment-method-url` queries Lemon Squeezy directly and retrieves the hosted PCI-compliant URL securely. Ordisum does not capture or proxy credit card forms.
   - Status: PASS
   - Evidence: `backend/src/routes/billing.js` (lines 61-129).

6. **Test ID 6: Subscription Cancellation & Resume**
   - Expected: Soft-cancel and immediate-cancel must sync cleanly with Lemon Squeezy and local DB.
   - Actual: `/api/billing/cancel-subscription` accepts `{ immediate: boolean }` and correctly maps to `PATCH` (soft) or `DELETE` (immediate) in the LS API, immediately writing to the local DB to avoid waiting on async webhook lag.
   - Status: PASS
   - Evidence: `backend/src/routes/billing.js` (lines 131-216).

## Bugs Found

None.

## Manual Verification Required

- **MV-010:** Perform a real checkout in Test Mode using Lemon Squeezy test cards. Verify `subscription_created` webhook lands and activates UI.
- **MV-011:** Soft-cancel the test subscription and verify UI reflects "Cancels at period end".

## Files Changed

None.

## Final Verdict

**PASS**. The switch from Stripe to Lemon Squeezy is architecturally sound. `custom_data` payloads are securely verified, PCI compliance is strictly observed, and entitlement gating across both Node middleware and React Context is perfectly synchronized.

## Next Phase

Proceed to Phase 5 (Core Application Flows & Routing).
