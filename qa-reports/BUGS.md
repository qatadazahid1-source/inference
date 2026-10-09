# Bugs Found & Fixed

## Critical Production Bugs Fixed (2026-10-09)

### 1. [CRITICAL - FIXED] Business / Enterprise Hard Budget Enforcement Blocked (HTTP 403)
- **Problem:** When an organization subscribed to the Business plan attempted to enable hard budget limits, `PUT /api/budgets/:id` failed with `403 Forbidden` (`Hard budget enforcement is not available on your plan`).
- **Root Cause:** Migration `00020_final_live_billing_plans.sql` omitted `hard_budget_enforcement` from the `features` JSON inside `system_limits` for the Business and Enterprise plans in table `plans`. `attachEntitlements` defaulted to `false`.
- **Fix:** Created and executed migration `00021_fix_business_enterprise_entitlements.sql` which explicitly sets `hard_budget_enforcement: true`, `cost_spike_detection: true` on Business/Enterprise, and `anomaly_detection: true` on Enterprise.

### 2. [CRITICAL - FIXED] Sub-Cent Budget Truncation in PostgreSQL ($0.001 Rounded to $0)
- **Problem:** When saving a budget amount of `$0.001`, PostgreSQL stored `0.00`, causing the UI to display `$0.00` and `$0 / month`.
- **Root Cause:** PostgreSQL columns `budgets.total_budget` and `budgets.current_spend` were typed as `NUMERIC(18, 2)` and `NUMERIC(12, 2)`, automatically rounding inputs to 2 decimal places.
- **Fix:** Altered both columns to `NUMERIC(18, 6)` in PostgreSQL, allowing exact storage of sub-cent amounts down to micro-dollars.

### 3. [CRITICAL - FIXED] Modal Auto-Focus Snatching on Every Keystroke
- **Problem:** Typing in numeric input fields inside modals (e.g. typing `0.001`) caused the input to lose focus on every single keystroke, requiring the user to re-click the input field after every character.
- **Root Cause:** `Modal.tsx` had `handleKeyDown` in its `useEffect` dependency array, which in turn depended on `onClose`. Because `BudgetManager.tsx` passed an inline anonymous function `onClose={() => ...}`, every keystroke updated parent state, re-rendered `BudgetManager`, generated a new `onClose` reference, and triggered `Modal`'s effect to re-run `requestAnimationFrame(() => firstFocusable.focus())`.
- **Fix:** Refactored `Modal.tsx` to hold `onClose` in a mutable ref (`onCloseRef.current = onClose`) and track open transitions with `wasOpenRef`. Auto-focus now runs strictly once when `isOpen` changes from `false` to `true`, and never on component re-renders while open.

### 4. [CRITICAL - FIXED] Frontend Sub-Cent Currency Formatting
- **Problem:** KPI cards and budget cards formatted sub-cent amounts like `0.001` with `maximumFractionDigits: 2`, rounding `$0.001` to `$0.00`.
- **Root Cause:** Hardcoded formatting parameters in `BudgetManager.tsx`.
- **Fix:** Added dynamic `formatCurrency(val)` helper that outputs up to 4 decimal places (`minimumFractionDigits: 3, maximumFractionDigits: 4`) for sub-cent amounts, preserving standard 2-decimal formatting for standard amounts.

### 5. [CRITICAL - FIXED] Budget Scope and Scope Value Omitted
- **Problem:** Creating or editing a budget discarded the selected scope (`team`, `project`, `provider`, `model`) and scope value, always defaulting back to `organization`.
- **Root Cause:** `handleFormSubmit` did not include `scope` and `scope_value` in the mutation payload, and backend routes did not destructure or store `scope_value`.
- **Fix:** Added `scope` and `scope_value` to `BudgetInput`, frontend form submission, edit hydration, and backend `POST`/`PUT` routes, with scope-specific filtering in `GET /api/budgets`.

### 6. [FIXED] `xlsx_export` Plan Gating Disconnect
- **Problem:** Creating or downloading XLSX reports was gated by `req.entitlements.hasFeature('xlsx_export')`, but `xlsx_export` was missing from `FALLBACK_LIMITS` and plan definitions.
- **Fix:** Added `xlsx_export: true` to `professional`, `business`, and `enterprise` plans in database, and added `xlsx_export: false` to `FALLBACK_LIMITS` and TypeScript definitions.
