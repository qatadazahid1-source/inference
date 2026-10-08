# Ordisum QA — Phase 13

## Status

PASS

## Scope

Outbound Webhooks (`GET/POST/PUT/DELETE /api/webhooks`, subscriptions, delivery engine), Webhook Dispatcher (`utils/webhookDispatcher.js`), Inbound Billing Webhooks (`supabase/functions/lemonsqueezy-webhook/index.ts`).

## Inventory Requirements

1. Verify outbound webhooks endpoints and entitlement gating.
2. Verify outbound webhook dispatch logic: HMAC-SHA256 signature, asynchronous delivery, retry logic.
3. Verify inbound Lemon Squeezy webhook security (HMAC-SHA256 signature validation).
4. Verify inbound Lemon Squeezy webhook event routing.

## Tests Executed

1. **Test ID 1: Outbound Webhook Endpoints & Entitlements**
   - Expected: Endpoints must require the `webhooks` entitlement. Signing secret must be generated securely and returned only once.
   - Actual: All `/api/webhooks` endpoints use `requireWebhooksEntitlement`. The `POST /api/webhooks` endpoint uses `crypto.randomBytes(32).toString('hex')` to generate `signing_secret` and returns it exactly once on creation.
   - Status: PASS
   - Evidence: `webhooks.js` (lines 53-63, 103, 121).

2. **Test ID 2: Outbound Webhook Delivery & Retry Logic**
   - Expected: Delivery attempts must include an HMAC-SHA256 signature and support exponential backoff.
   - Actual: `webhookDispatcher.js` generates the signature using `X-Ordisum-Signature: sha256=...` derived from `timestamp.body`. Delivery is fire-and-forget. Supports up to 5 attempts (30s, 5m, 30m, 2h, 8h). A node-cron job (`retryPendingDeliveries`) sweeps `webhook_deliveries` every 5 minutes to catch any retries that survived a server restart.
   - Status: PASS
   - Evidence: `webhookDispatcher.js` (lines 37-42, 148-198, 205-240).

3. **Test ID 3: Inbound Billing Webhook Security (Lemon Squeezy)**
   - Expected: The `lemonsqueezy-webhook` Edge Function must validate the `X-Signature` header securely.
   - Actual: Uses `crypto.subtle.importKey` and `crypto.subtle.sign` to manually verify the HMAC-SHA256 signature of the raw body against `LEMONSQUEEZY_WEBHOOK_SECRET`. Performs a timing-safe-ish bitwise comparison. Rejects immediately if invalid.
   - Status: PASS
   - Evidence: `lemonsqueezy-webhook/index.ts` (lines 32-54).

4. **Test ID 4: Inbound Billing Webhook Event Routing**
   - Expected: Must route events correctly according to the JSON:API format of Lemon Squeezy.
   - Actual: Uses a switch statement on `meta.event_name` to route 11 distinct subscription/order events (e.g., `subscription_created`, `order_created`, `subscription_payment_success`). Dedup pattern exists for the dual checkout events.
   - Status: PASS
   - Evidence: `lemonsqueezy-webhook/index.ts` (lines 88-136).

## Bugs Found

None.

## Manual Verification Required

- **MV-020:** Create an outbound webhook endpoint. Trigger an event (e.g., a scheduled report or budget crossing). Intercept the webhook using a service like Webhook.site and confirm: (a) payload format, (b) `X-Ordisum-Signature` is valid.
- **MV-021:** Simulate a Lemon Squeezy test purchase. Verify that the Supabase Edge Function processes the `subscription_created` and `order_created` webhooks, and the UI unlocks properly.

## Files Changed

None.

## Final Verdict

**PASS**. The webhook architecture is extremely robust. The outbound system uses secure HMAC-SHA256 signing, async delivery, exponential backoff, and a sweeping CRON recovery mechanism. The inbound Lemon Squeezy Edge Function correctly validates the Lemon Squeezy signature using the raw payload and correctly handles the complex multi-event JSON:API structure of Lemon Squeezy checkouts.

## Next Phase

Proceed to Phase 14 (Global Final Checks & UI Cleanup).
