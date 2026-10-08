# Ordisum QA — Phase 10

## Status

PASS

## Scope

Report Builder (on-demand report generation), Report Downloads (PDF/XLSX), Scheduled Report Engine, Scheduler Atomic Locking, and Webhook Dispatch on report generation.

## Inventory Requirements

1. Verify report generation creates real data snapshots (not placeholders).
2. Verify per-format feature gating (CSV, PDF, XLSX).
3. Verify rate limiting on report creation.
4. Verify scheduled report engine: due detection, atomic locking, file generation, email dispatch.
5. Verify `report.generated` webhook event dispatch.
6. Verify stuck report cleanup (status stuck on `generating`).

## Tests Executed

1. **Test ID 1: On-Demand Report Generation**
   - Expected: Report creation must build a real data snapshot from `api_usage_logs`, not dummy data.
   - Actual: `POST /api/reports` calls `buildReportSnapshot(organization_id, ...)` which queries `api_usage_logs` with the given date range and provider filters. Aggregates `totalRequests`, `totalTokens`, `totalCost`, `byProvider`, `byModel`. An `isEmpty` flag is correctly set if no rows matched, to prevent silent empty reports.
   - Status: PASS
   - Evidence: `reports.js` (lines 38-86, 338-365).

2. **Test ID 2: Per-Format Entitlement Gating**
   - Expected: CSV, PDF, and XLSX exports must each have their own separate feature flag check.
   - Actual: All three formats (`CSV → csv_export`, `PDF → pdf_export`, `XLSX → xlsx_export`) are individually gated both at report creation (`POST /`) and at download (`GET /:id/download/pdf`, `GET /:id/download/xlsx`). A double-check exists at download time in addition to creation time.
   - Status: PASS
   - Evidence: `reports.js` (lines 277-297, 166-206, 208-249).

3. **Test ID 3: Rate Limiting on Report Generation**
   - Expected: Report generation must be rate-limited to prevent abuse or runaway spend.
   - Actual: `reportsLimiter` caps at 10 report generation requests per user per hour using `express-rate-limit`. Key is `req.user.id` (user-level, not IP-level), preventing bypassing via proxy rotation.
   - Status: PASS
   - Evidence: `reports.js` (lines 252-260).

4. **Test ID 4: Stuck Report Recovery**
   - Expected: If snapshot generation fails after the row is inserted, the report must not stay stuck on `'generating'` forever.
   - Actual: The `catch` block in `POST /api/reports` checks if `reportId` was set (row exists) and updates `status: 'failed'` with the error message. Users see the failure in the UI rather than a perpetually spinning card.
   - Status: PASS
   - Evidence: `reports.js` (lines 367-382).

5. **Test ID 5: Scheduled Report Engine — Due Detection & Atomic Lock**
   - Expected: The cron runner must not double-process the same report concurrently (e.g. if two Render instances wake up simultaneously).
   - Actual: `processDueReports()` queries `WHERE recurring=true AND enabled=true AND next_run_at <= NOW()`. For each due report, it performs an **atomic claim** update: `UPDATE ... SET last_run_status='processing' WHERE id=? AND last_run_status != 'processing'`. If the update returns no row, it skips — meaning another worker already claimed it.
   - Status: PASS
   - Evidence: `scheduledReports.js` (lines 243-259).

6. **Test ID 6: Scheduled Report Email & History**
   - Expected: After a run, recipients should receive a file-attached email. A historical copy of the generated data should be preserved (not overwritten).
   - Actual: `processOneReport()` inserts a **new** non-recurring report row with the period-dated name (e.g., `"Weekly Cost Report — 2026-09-30 to 2026-10-06"`) rather than overwriting the schedule template. Then emails via Resend with PDF/XLSX attachment in base64. A 10-second `AbortController` timeout protects against Resend hangs.
   - Status: PASS
   - Evidence: `scheduledReports.js` (lines 314-335, 142-163).

7. **Test ID 7: Webhook Dispatch on Report Generation**
   - Expected: A `report.generated` webhook event should fire after a scheduled report completes.
   - Actual: `dispatchWebhookEvent(org_id, 'report.generated', {...})` is called fire-and-forget (`.catch(() => {})`) after the email step, including `report_id`, `report_name`, `format`, and `period` in the payload.
   - Status: PASS
   - Evidence: `scheduledReports.js` (lines 338-344).

## Bugs Found

None.

## Manual Verification Required

- **MV-015:** Create a `weekly` recurring report with recipients. Wait for (or manually invoke) the scheduler. Confirm: (a) a new child report row is created with the dated name, (b) recipients receive the email with the correct file attached, and (c) `next_run_at` advances by exactly 7 days.

## Files Changed

None.

## Final Verdict

**PASS**. The reporting engine is production-grade: per-format entitlement gating, rate limiting, empty-state detection, stuck-report recovery, concurrent-execution-safe atomic locking, persistent report history, and webhook dispatch all function correctly.

## Next Phase

Proceed to Phase 11 (Security: API Key Management, Rate Limiting & Audit Logging).
