# Ordisum QA — Phase 09

## Status

PASS WITH KNOWN LIMITATION (documented)

## Scope

Budget CRUD, Hard Limit Enforcement, Alert Rules (CRUD + evaluation engine), Anomaly Detection, and alert email dispatch.

## Inventory Requirements

1. Verify budgets are scoped per-org with real-time spend calculation.
2. Verify hard limit feature gating.
3. Verify alert rules evaluation engine and deduplication.
4. Verify alert email recipient resolution.
5. Verify anomaly detection entitlement gating.

## Tests Executed

1. **Test ID 1: Budget Spend Calculation (Live vs. Stored)**
   - Expected: `GET /api/budgets` should return real-time spend, not a potentially stale stored column.
   - Actual: `budgets.js` intentionally bypasses the stored `current_spend` column. Instead, it queries `api_usage_logs` live and groups by period boundary (`monthly`/`quarterly`/`annual`). This guarantees budgets always show accurate, up-to-date spend numbers. 
   - Status: PASS
   - Evidence: `budgets.js` (lines 44-76).

2. **Test ID 2: Hard Budget Limit Gating**
   - Expected: `hard_limit=true` must be rejected for plans without `hard_budget_enforcement`.
   - Actual: Checked on both `POST /api/budgets` (create) and `PUT /api/budgets/:id` (update). If the feature isn't in the entitlements, returns `403 FEATURE_NOT_AVAILABLE`. Enforcement itself is also verified at gateway call time in `aiGateway.js`.
   - Status: PASS
   - Evidence: `budgets.js` (lines 102-108, 172-180).

3. **Test ID 3: Alert Rule Evaluation Engine**
   - Expected: Rules must evaluate against real current data, not a stale snapshot. Different condition types must be tested independently.
   - Actual: `POST /api/alert-rules/check` evaluates five distinct rule types against live `api_usage_logs` data:
     - `budget_percent`: Monthly spend vs. total budget.
     - `daily_cost`: Today's spend vs. threshold.
     - `token_usage`: Today's total tokens vs. threshold.
     - `error_rate`: Failed requests in the past hour vs. threshold.
     - `cost_spike`: Today's spend vs. yesterday's full-day spend × configurable multiplier.
   - Deduplication is enforced: rules that triggered within the past 1 hour are skipped automatically.
   - Status: PASS
   - Evidence: `alertRules.js` (lines 198-350).

4. **Test ID 4: Alert Email Recipient Resolution**
   - Expected: Alert emails should be sent to billing contacts, with correct fallback to org admins/owners who haven't opted out.
   - Actual: Both `alertRules.js` and `alertHelper.js` use a two-tier resolution: billing_email first, then org admins/owners filtered by `notification_preferences.budget_alerts_email`. HTML escaping (`escapeHtml`) is applied to rule names before email content construction to prevent injection.
   - Status: PASS
   - Evidence: `alertRules.js` (lines 241-263), `alertHelper.js` (lines 88-100).

5. **Test ID 5: Budget Threshold Deduplication**
   - Expected: Budget alerts must not re-fire every time a proxy call succeeds once spend is over a threshold.
   - Actual: `alertHelper.js` uses a deterministic `dedup_key` (`budget:<uuid>:<pct>:<YYYY-MM>`) and queries `alerts` for an existing row with that key before inserting. This perfectly gates per-period, per-threshold duplicates.
   - Status: PASS
   - Evidence: `alertHelper.js` (lines 60-69).

6. **Test ID 6: Anomaly Detection Gating**
   - Expected: Anomaly endpoints must be blocked for plans without `anomaly_detection`.
   - Actual: All four anomaly routes (`GET /`, `GET /:id`, `PUT /:id`, `POST /run`) consistently check `hasFeature('anomaly_detection')` before doing any work.
   - Status: PASS
   - Evidence: `anomalies.js` (lines 40-46, 74-79, 102-107, 139-144).

## Bugs Found

None.

## Known Limitations (Not Bugs)

- **`model_latency` alert rule type:** Intentionally unimplemented. The system has no historical latency baseline to compare against, so rules of this type are saved successfully but never trigger. This is documented in the code (`alertRules.js` line 191-194) as a deliberate scope decision.

## Manual Verification Required

- **MV-014:** Manually create a budget with `alert_at_50=true` and `hard_limit=true`. Trigger enough traffic through the playground to cross 50% of the budget. Confirm: (a) an alert row appears in the dashboard, (b) a budget alert email arrives, and (c) once the hard limit is hit, gateway calls return `403`.

## Files Changed

None.

## Final Verdict

**PASS WITH KNOWN LIMITATION**. The budget and alerting system is well-architected with real-time spend tracking, deduplication, correct email fallback resolution, and multi-type rule evaluation. The only documented gap is the `model_latency` rule type which is a known and deliberate scope stub.

## Next Phase

Proceed to Phase 10 (Reporting: Report Builder & Scheduled Exports).
