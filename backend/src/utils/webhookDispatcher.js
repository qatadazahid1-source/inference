/**
 * Outbound Webhook Dispatcher
 * ────────────────────────────
 * Dispatches events to customer-configured webhook endpoints with:
 *  - HMAC-SHA256 signature (X-Ordisum-Signature header)
 *  - Exponential back-off retry (up to 5 attempts)
 *  - Delivery logging in webhook_deliveries table
 *  - 15-second timeout per attempt (never blocks main request)
 *
 * Usage:
 *   import { dispatchWebhookEvent } from './webhookDispatcher.js';
 *   await dispatchWebhookEvent(organization_id, 'budget.threshold_reached', payload);
 *
 * Call this fire-and-forget — it manages its own retry schedule.
 */

import crypto from 'crypto';
import { supabase } from '../index.js';

const MAX_ATTEMPTS = 5;
const TIMEOUT_MS   = 15_000;

// Exponential back-off delays (ms): 30s, 5m, 30m, 2h, 8h
const RETRY_DELAYS_MS = [
  30_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  8 * 60 * 60_000,
];

/**
 * Create HMAC-SHA256 signature for the payload.
 * Customers verify using:
 *   HMAC-SHA256(signingSecret, `${timestamp}.${rawBody}`)
 */
function sign(secret, timestamp, body) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

/**
 * Attempt one HTTP delivery. Returns { success, httpStatus, responseSummary }.
 */
async function attemptDelivery(url, signingSecret, eventType, payload) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr   = JSON.stringify(payload);
  const signature = sign(signingSecret, timestamp, bodyStr);

  const headers = {
    'Content-Type':          'application/json',
    'X-Ordisum-Event':       eventType,
    'X-Ordisum-Timestamp':   timestamp,
    'X-Ordisum-Signature':   `sha256=${signature}`,
  };

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers,
      body:    bodyStr,
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    });

    const text = await res.text().catch(() => '');
    return {
      success:         res.ok,
      httpStatus:      res.status,
      responseSummary: text.slice(0, 500),
    };
  } catch (err) {
    return {
      success:         false,
      httpStatus:      null,
      responseSummary: err.message?.slice(0, 500) ?? 'Network error',
    };
  }
}

/**
 * Dispatch an event to all enabled endpoints subscribed to it.
 * Creates delivery records and schedules retries automatically.
 * Fire-and-forget safe — errors are caught internally.
 */
export async function dispatchWebhookEvent(organization_id, eventType, eventPayload) {
  try {
    // 1. Find all enabled endpoints for this org that subscribe to this event
    const { data: endpoints, error } = await supabase
      .from('webhook_endpoints')
      .select(`
        id,
        url,
        signing_secret,
        enabled,
        webhook_subscriptions!inner (event_type, enabled)
      `)
      .eq('organization_id', organization_id)
      .eq('enabled', true)
      .eq('webhook_subscriptions.event_type', eventType)
      .eq('webhook_subscriptions.enabled', true);

    if (error) {
      console.error('[webhook] Fetch endpoints error:', error.message);
      return;
    }
    if (!endpoints || endpoints.length === 0) return;

    const payload = {
      event:     eventType,
      timestamp: new Date().toISOString(),
      data:      eventPayload,
    };

    // 2. Create a delivery record for each endpoint and attempt immediately
    for (const endpoint of endpoints) {
      // Insert delivery record
      const { data: delivery, error: insertErr } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_endpoint_id: endpoint.id,
          organization_id,
          event_type:  eventType,
          payload,
          status:      'pending',
          attempt_count: 0,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[webhook] Delivery record insert error:', insertErr.message);
        continue;
      }

      // Attempt delivery immediately (non-blocking)
      _attemptWithRetry(delivery.id, endpoint, payload, eventType, 0).catch(err =>
        console.error('[webhook] Unhandled retry error:', err.message)
      );
    }
  } catch (err) {
    console.error('[webhook] dispatchWebhookEvent error:', err.message);
  }
}

/**
 * Attempt delivery for a delivery record, with exponential back-off retry.
 * This runs asynchronously and updates the delivery record after each attempt.
 */
async function _attemptWithRetry(deliveryId, endpoint, payload, eventType, attemptIndex) {
  const { success, httpStatus, responseSummary } = await attemptDelivery(
    endpoint.url,
    endpoint.signing_secret,
    eventType,
    payload
  );

  const attemptCount  = attemptIndex + 1;
  const now           = new Date().toISOString();
  const isFinalFail   = !success && attemptCount >= MAX_ATTEMPTS;
  const nextRetryDelay = !success && !isFinalFail ? RETRY_DELAYS_MS[attemptIndex] : null;
  const nextRetryAt   = nextRetryDelay ? new Date(Date.now() + nextRetryDelay).toISOString() : null;

  const newStatus = success       ? 'delivered'
                  : isFinalFail   ? 'failed'
                                  : 'retrying';

  await supabase
    .from('webhook_deliveries')
    .update({
      status:          newStatus,
      http_status:     httpStatus,
      attempt_count:   attemptCount,
      last_attempt_at: now,
      next_retry_at:   nextRetryAt,
      response_summary: responseSummary,
      updated_at:      now,
    })
    .eq('id', deliveryId);

  if (success) {
    console.log(`[webhook] Delivered ${eventType} to ${endpoint.url} (attempt ${attemptCount})`);
    return;
  }

  if (isFinalFail) {
    console.error(`[webhook] FAILED ${eventType} to ${endpoint.url} after ${attemptCount} attempts`);
    return;
  }

  // Schedule next retry
  console.warn(`[webhook] Retry ${attemptCount}/${MAX_ATTEMPTS} for ${eventType} → ${endpoint.url} in ${nextRetryDelay / 1000}s`);
  setTimeout(
    () => _attemptWithRetry(deliveryId, endpoint, payload, eventType, attemptIndex + 1).catch(() => {}),
    nextRetryDelay
  );
}

/**
 * Retry pending/retrying deliveries that are past their next_retry_at.
 * Called by the scheduler periodically to catch deliveries that missed
 * their in-memory retry timer (e.g. after a server restart).
 */
export async function retryPendingDeliveries() {
  const { data: due, error } = await supabase
    .from('webhook_deliveries')
    .select(`
      id,
      payload,
      event_type,
      attempt_count,
      webhook_endpoints (id, url, signing_secret, enabled)
    `)
    .in('status', ['retrying', 'pending'])
    .lt('next_retry_at', new Date().toISOString())
    .lte('attempt_count', MAX_ATTEMPTS - 1)
    .limit(50);

  if (error) {
    console.error('[webhook] retryPendingDeliveries fetch error:', error.message);
    return;
  }
  if (!due || due.length === 0) return;

  console.log(`[webhook] Retrying ${due.length} pending deliveries`);

  for (const delivery of due) {
    const ep = delivery.webhook_endpoints;
    if (!ep || !ep.enabled) continue;

    _attemptWithRetry(
      delivery.id,
      ep,
      delivery.payload,
      delivery.event_type,
      delivery.attempt_count
    ).catch(() => {});
  }
}
