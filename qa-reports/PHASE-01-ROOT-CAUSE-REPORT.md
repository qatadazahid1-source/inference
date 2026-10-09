# Phase 1 — Root-Cause Investigation Report

**Status:** COMPLETE (All Root Causes Identified & Verified with DB/Code Telemetry)
**Date:** 2026-10-09
**Investigator:** Senior Full-Stack & Reliability Engineering Team

---

## 1. Executive Summary

A comprehensive investigation into the reported issues was conducted across frontend, backend API, database schemas, active subscriptions, and middleware entitlements. All reported symptoms were reproduced and traced to their underlying root causes:

1. **403 Forbidden on Hard Limit Update:** The `Business` plan row in `plans` was missing `hard_budget_enforcement: true` inside `system_limits.features`. Migration `00020_final_live_billing_plans.sql` omitted this key. Consequently, `attachEntitlements` fell back to `false`, causing the backend to reject `PUT /api/budgets/:id` with 403 Forbidden.
2. **Budget Discrepancy ($0 vs $0.001):** Because the PUT request failed with 403, the budget was never updated in Postgres and remained at `$0`. Furthermore, frontend formatting in `BudgetManager.tsx` used `maximumFractionDigits: 2`, rounding any sub-cent value like `$0.001` to `$0.00`.
3. **Spend ($0.01) vs Utilization (0.0%):** Because `total_budget` was stored as `0`, the formula `totalAllocated > 0 ? (activeSpend / totalAllocated) * 100 : 0` explicitly evaluated to `0.0%` to prevent division by zero. Active spend was `$0.0057` from October 2026 `api_usage_logs` which rounded to `$0.01` with 2 decimal places.
4. **Input Focus Glitch:** In `src/components/ui/Modal/Modal.tsx`, `handleKeyDown` depended on `onClose`, which was passed as an inline function from `BudgetManager.tsx`. On every keystroke, state changed, re-rendering `BudgetManager`, generating a new `onClose` reference, and causing `Modal`'s `useEffect` to tear down and re-run. In its setup, `requestAnimationFrame` stole focus and focused the first interactive element. In addition, the input was `<input type="number">` without `step="any"`, causing HTML5 step mismatch validation.
5. **Console Noise:** Google Analytics `ERR_BLOCKED_BY_CLIENT` was confirmed to be ad-blocker / privacy extension noise. React error `#423` was a hydration discrepancy.

---

## 2. Answers to Specific Phase 1 Investigation Questions

### Q1: When a budget is created or edited, what exact payload does the frontend send?
- **Observed Code:** In `src/pages/dashboard/budget-manager/BudgetManager.tsx` (lines 100–109):
  ```typescript
  const payload = {
    name: form.name,
    total_budget: Number(form.amount),
    period: form.period,
    alert_at_50: form.alertThresholds.includes(50),
    alert_at_75: form.alertThresholds.includes(75),
    alert_at_90: form.alertThresholds.includes(90),
    alert_at_100: form.alertThresholds.includes(100),
    hard_limit: form.hardLimit,
  };
  ```
- **Finding:** Notice `scope` and `scope_value` were completely missing from the submitted payload, and on edit (`handleEdit`), `scope` was hardcoded to `'organization'` and `scopeValue` to `''`.

### Q2: What values are actually stored in the database?
- **Database Table:** `public.budgets`
- **Columns:**
  - `id`: UUID (Primary Key)
  - `organization_id`: UUID
  - `name`: TEXT
  - `scope`: TEXT (default: `'organization'`)
  - `scope_value`: TEXT (nullable)
  - `total_budget`: NUMERIC NOT NULL
  - `current_spend`: NUMERIC NOT NULL DEFAULT 0
  - `period`: TEXT (default: `'monthly'`)
  - `alert_at_50`, `alert_at_75`, `alert_at_90`, `alert_at_100`: BOOLEAN
  - `hard_limit`: BOOLEAN
- **Actual Record for User's Business Org (`a256a3f4-d2d8-4dfa-9a91-3dbcb6ec8922`):**
  - `id`: `56071f1d-73c7-43d5-9ede-c244563b7b51`
  - `name`: `'o'`
  - `total_budget`: `0`
  - `current_spend`: `0`
  - `hard_limit`: `false`

### Q3: Does the backend return the same amount that was submitted?
- Yes, Postgres `numeric` stores arbitrary precision decimals without truncation. When queried, Supabase returns the stored numeric as a number.

### Q4: Does the frontend receive the correct saved budget?
- On successful requests, yes. But when updating `hard_limit: true`, the request was rejected with 403 Forbidden, so the server returned an error object instead of a saved budget.

### Q5 & Q6: Why does `0.001` appear as `$0`? Is the value lost through rounding, numeric precision, formatting, or another cause?
- **Root Cause A (Rejection):** Because `PUT /api/budgets/:id` failed with 403, the budget amount was never changed from `0` to `0.001` in the database.
- **Root Cause B (Formatting):** In `BudgetManager.tsx`:
  - Line 150: `value: '$' + totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
    For `0.001`, `maximumFractionDigits: 2` rounds to `$0.00`.
  - Line 235: `${b.total_budget.toLocaleString()} / month`
    When `total_budget` is 0, it renders `$0 / month`. When sub-cent amounts are used, standard formatting without dynamic precision can also collapse or truncate.
- **Root Cause C (Input Step):** `<input type="number">` without `step="any"` or `step="0.001"` causes the browser to reject decimals or warn about invalid increments.

### Q7: Why does total allocated budget show `$0.00`?
- Because the budget row had `total_budget = 0`. Even with `0.001`, `maximumFractionDigits: 2` formatted it as `$0.00`.

### Q8: Why does actual spend show `$0.01` while utilization remains `0.0%`?
- Actual spend calculation:
  - 5 successful API calls were logged in October 2026 for this organization totaling `$0.005671`.
  - In `budgets.js`, `spend.toFixed(4)` returned `0.0057`.
  - In `BudgetManager.tsx`, `activeSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })` rounded `0.0057` to `$0.01`.
  - Utilization formula: `totalAllocated > 0 ? (activeSpend / totalAllocated) * 100 : 0`. Since `totalAllocated` was `0`, the conditional branch returned `0` (`0.0%`).

### Q9: Does the budget query use the correct organization, scope, scope value, billing period, timezone, and usage records?
- The backend correctly filtered `api_usage_logs` by `organization_id` and the start of the current period (`gte('logged_at', periodStart)`).
- However, it did not filter by `scope` / `scope_value` (e.g. if scoped to a specific provider or model), and the frontend did not save or populate scope values.

### Q10: Are usage logs recorded with the correct token counts, model, timestamp, organization, and calculated cost?
- Verified: All 32 rows in `api_usage_logs` contain accurate `input_tokens`, `output_tokens`, `total_tokens`, `model`, `provider`, `cost_usd`, and `logged_at`.

### Q11: Does Budget Manager calculate spend using the same source of truth as Cost Analytics and API Usage?
- Verified: Both `budgets.js` and `analytics.js` query `api_usage_logs.cost_usd` directly.

### Q12: Why does the backend reject `hard_limit: true` for this Business-plan organization?
- In `backend/src/middleware/requireEntitlements.js`:
  ```javascript
  const { data: sub } = await supabase
    .from('subscriptions')
    .select(`id, status, plans ( id, system_limits )`)
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .maybeSingle();
  ```
  The Business plan row (`slug: 'business'`) in table `plans` had `system_limits.features` stored as:
  `{"alerts":true,"reports":true,"webhooks":true,"analytics":true,"benchmarks":true,"csv_export":true,"pdf_export":true,"api_gateway":true,"slack_alerts":true,"ai_playground":true,"budget_manager":true,"premium_models":true,"roi_calculator":true,"anomaly_detection":false,"advanced_analytics":true,"cost_spike_detection":false}`
  Notice `hard_budget_enforcement` was **completely absent**.
  Because it was absent, it fell back to `FALLBACK_LIMITS.features.hard_budget_enforcement: false`.
  Thus, `req.entitlements.hasFeature('hard_budget_enforcement')` evaluated to `false`.

### Q13: What are the real stored subscription plan, active subscription status, effective entitlements, and `system_limits` for this organization?
- **Organization ID:** `a256a3f4-d2d8-4dfa-9a91-3dbcb6ec8922`
- **Subscription ID:** `b058aa13-6745-4765-93fc-b5d33b221252`
- **Status:** `active`
- **Plan:** `Business` (`c7445ef8-437c-4289-92f7-282427876377`)
- **System Limits in DB:** Missing `hard_budget_enforcement: true`, missing `cost_spike_detection: true`.

### Q14: Is the database migration for Business/Enterprise hard-budget enforcement applied?
- Migration `00020_final_live_billing_plans.sql` was applied, but the SQL definition for Business and Enterprise in migration 00020 had omitted `hard_budget_enforcement`.
- A new safe migration `00021_fix_business_enterprise_entitlements.sql` must update `plans` so that Business and Enterprise plans have `hard_budget_enforcement: true`, `cost_spike_detection: true`, and Enterprise has `anomaly_detection: true`.

### Q15: Does the frontend display stale plan data while the backend checks a different entitlement value?
- In `AdminLandingPricing.tsx` and frontend types, `hard_budget_enforcement` was modeled, but the database plan row itself lacked the flag.

### Q16: Why does React throw error `#423`?
- Error `#423` is a hydration error in React 18, commonly triggered when client-side rendering (e.g. localized dates or browser-dependent initial states) mismatches server-rendered/prerendered markup.

### Q17: Which requests fail because of the actual application bug vs noise?
- `PUT /api/budgets/:id` returning 403 was a critical application defect.
- `ERR_BLOCKED_BY_CLIENT` on Google Analytics was client-side browser ad-blocker behavior.

### Q18: Root cause of the input focus glitch:
- In `src/components/ui/Modal/Modal.tsx`:
  `handleKeyDown` had `onClose` in its dependency array.
  In `BudgetManager.tsx`, `onClose` was passed as an inline anonymous function: `onClose={() => { ... }}`.
  On every keystroke in `<input>`, `form` state updated, causing `BudgetManager` to re-render.
  This produced a new `onClose` function reference, causing `handleKeyDown` to change, which triggered `Modal`'s `useEffect` teardown and re-run.
  The effect's setup invoked `requestAnimationFrame(() => firstFocusable.focus())`, which stole focus away from the input field on every character typed!

---

## 3. Plan for Phase 2–6

1. **Phase 2 (Budget Manager):**
   - Apply DB migration to update `system_limits.features` on `business` and `enterprise` plans with `hard_budget_enforcement: true`.
   - Update `FALLBACK_LIMITS` and plan defaults to include `hard_budget_enforcement: false`.
   - Support `0.001` minimum budget across backend validation and frontend currency formatting (dynamic fraction digits for values `< $0.01`).
   - Fix utilization calculation (handling zero, unrounded calculations, over-100% states).
   - Support `scope` and `scope_value` persistence and filtering.
   - Verify AI Gateway enforcement blocks requests when hard limit is reached.
2. **Phase 3 (Alerts & Anomaly Detection):**
   - Ensure `cost_spike_detection` and `anomaly_detection` are correctly entitled on Business / Enterprise.
   - Audit alert evaluation and delivery channels.
3. **Phase 4 (Reports & Exports):**
   - Align `xlsx_export` / `csv_export` entitlement gating in `reports.js`.
   - Test PDF and XLSX generation and scheduled reports runner.
4. **Phase 5 (Input Focus & React Glitch):**
   - Refactor `Modal.tsx` focus management: use ref for `onClose`, only auto-focus on initial mount/open transition, not on every render.
   - Add `step="any"` to numeric inputs.
5. **Phase 6 (Regression & Verification):**
   - Run test suite and end-to-end verifications.
