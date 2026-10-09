import { execFile } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { supabase } from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Project root is 3 levels up from backend/src/controllers/
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'sync-portkey-pricing.mjs');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'data', 'portkey-pricing.json');

/**
 * Converts USD per 1M tokens → USD per 1K tokens
 * e.g. 1.75 → 0.00175
 */
function per1mToPer1k(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Number((value / 1000).toFixed(10));
}

import { stageRecords, buildDiff, applyDiff, getImportSummary } from '../services/sync/importEngine.js';

// ─── In-memory job store ─────────────────────────────────────────────────────
// Survives for the lifetime of the Node process (fine for admin-only usage).
// Shape: { [jobId]: { status, logs, result, error, startedAt, finishedAt } }
const jobs = new Map();

// Clean up jobs older than 30 minutes to prevent memory leaks
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.startedAt < cutoff) jobs.delete(id);
  }
}, 5 * 60 * 1000);

// ─── Background worker ────────────────────────────────────────────────────────
async function runPortkeySyncJob(jobId) {
  const job = jobs.get(jobId);
  const log = (msg) => {
    console.log(`[Portkey/${jobId}] ${msg}`);
    job.logs.push(msg);
  };

  try {
    log('Starting sync from Portkey GitHub...');

    // 1. Run the sync script
    const scriptLogs = await new Promise((resolve, reject) => {
      const collectedLogs = [];
      execFile(
        process.execPath,
        [SCRIPT_PATH, '--out', OUTPUT_PATH],
        {
          cwd: PROJECT_ROOT,
          timeout: 180_000, // 3 minutes — no HTTP timeout here, runs in background
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (stdout) collectedLogs.push(...stdout.split('\n').filter(Boolean));
          if (stderr) collectedLogs.push(...stderr.split('\n').filter(Boolean).map(l => `[ERR] ${l}`));
          if (error && error.code !== 2) {
            reject(new Error(`Script failed (exit ${error.code}): ${error.message}`));
          } else {
            resolve(collectedLogs);
          }
        }
      );
    });

    scriptLogs.forEach(l => job.logs.push(l));
    log('Script finished. Reading output...');

    // 2. Read generated JSON
    const jsonText = await readFile(OUTPUT_PATH, 'utf8');
    const rawData = JSON.parse(jsonText);

    // 3. Normalize
    const normalizedRecords = (rawData.models || []).map(m => ({
      provider: m.provider,
      model_id: m.model,
      input_cost_per_1k: per1mToPer1k(m.input_usd_per_1m) ?? 0,
      output_cost_per_1k: per1mToPer1k(m.output_usd_per_1m) ?? 0,
      context_window: null,
    }));

    log(`Fetched ${normalizedRecords.length} models. Staging into database...`);

    // 4. Stage + Diff
    const stageResult = await stageRecords(normalizedRecords, 'portkey', 'Portkey GitHub', supabase);
    log(`Staged ${normalizedRecords.length} models. Analyzing diff against existing pricing...`);
    
    const diffResult = await buildDiff(stageResult.importId, supabase);
    log(`Diff complete! New: ${diffResult.counts?.new || 0}, Same: ${diffResult.counts?.same || 0}, Changed: ${diffResult.counts?.changed || 0}`);
    log(`importId=${stageResult.importId}`);

    const models = (rawData.models || []).map(m => ({
      provider: m.provider,
      model: m.model,
      input_usd_per_1k:        per1mToPer1k(m.input_usd_per_1m),
      output_usd_per_1k:       per1mToPer1k(m.output_usd_per_1m),
      cache_read_usd_per_1k:   per1mToPer1k(m.cache_read_usd_per_1m),
      cache_write_usd_per_1k:  per1mToPer1k(m.cache_write_usd_per_1m),
      audio_input_usd_per_1k:  per1mToPer1k(m.audio_input_usd_per_1m),
      audio_output_usd_per_1k: per1mToPer1k(m.audio_output_usd_per_1m),
      currency: m.currency,
    }));

    job.status = 'done';
    job.result = {
      success: true,
      summary: rawData.summary,
      generated_at: rawData.generated_at,
      models,
      importId: stageResult.importId,
      diffCounts: diffResult.counts,
    };
    job.finishedAt = Date.now();
    log('Job complete.');
  } catch (err) {
    console.error(`[Portkey/${jobId}] FAILED:`, err.message);
    job.status = 'error';
    job.error = err.message;
    job.finishedAt = Date.now();
  }
}

// ─── POST /run-portkey-sync ───────────────────────────────────────────────────
// Immediately returns a jobId; actual work runs in background.
export const runPortkeySync = async (req, res) => {
  try {
    await access(SCRIPT_PATH);
  } catch {
    return res.status(500).json({
      success: false,
      error: `Sync script not found at: ${SCRIPT_PATH}`,
    });
  }

  const jobId = randomUUID();
  jobs.set(jobId, {
    status: 'running',
    logs: [],
    result: null,
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
  });

  // Fire-and-forget — does NOT block the HTTP response
  runPortkeySyncJob(jobId).catch(() => {});

  // Respond immediately — Render 30s timeout will never be hit
  return res.json({ success: true, jobId, status: 'running' });
};

// ─── GET /portkey-sync-status/:jobId ─────────────────────────────────────────
export const getPortkeySyncStatus = (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found or expired.' });
  }

  if (job.status === 'running') {
    return res.json({ success: true, status: 'running', logs: job.logs });
  }

  if (job.status === 'error') {
    return res.status(500).json({ success: false, status: 'error', error: job.error, logs: job.logs });
  }

  // done
  return res.json({ success: true, status: 'done', logs: job.logs, ...job.result });
};

// ─── POST /apply-portkey-sync ─────────────────────────────────────────────────
export const applyPortkeySyncToDB = async (req, res) => {
  console.log('[Portkey Sync] Applying pricing to database...');

  let { importId } = req.body || {};

  try {
    if (!importId) {
      console.log('[Portkey Sync] No importId provided. Re-staging from JSON file...');
      let rawData;
      try {
        const jsonText = await readFile(OUTPUT_PATH, 'utf8');
        rawData = JSON.parse(jsonText);
      } catch (err) {
        return res.status(500).json({
          success: false,
          error: `No synced data found. Please run 'sync' first. (${err.message})`,
        });
      }

      const normalizedRecords = (rawData.models || []).map(m => ({
        provider: m.provider,
        model_id: m.model,
        input_cost_per_1k: per1mToPer1k(m.input_usd_per_1m) ?? 0,
        output_cost_per_1k: per1mToPer1k(m.output_usd_per_1m) ?? 0,
        context_window: null,
      }));

      if (normalizedRecords.length === 0) {
        return res.status(400).json({ success: false, error: 'Fetched data is empty.' });
      }

      const stageResult = await stageRecords(normalizedRecords, 'portkey', 'Portkey GitHub', supabase);
      await buildDiff(stageResult.importId, supabase);
      importId = stageResult.importId;
    }

    const report = await applyDiff(importId, supabase, {
      applyNew: true,
      applyChanges: true,
      applyConflicts: false,
      changedBy: req.user?.id || 'SYSTEM',
    });

    console.log(`[Portkey DB Apply] Done. Applied: ${report.applied}`);

    res.json({
      success: true,
      insertedCount: report.inserted,
      updatedCount: report.updated,
      skippedCount: report.skipped,
      keptCount: report.kept,
      totalProcessed: report.applied + report.skipped + report.kept,
      report,
    });
  } catch (error) {
    console.error('[Portkey DB Apply] Error:', error.message);
    res.status(500).json({ success: false, error: 'Database apply failed: ' + error.message });
  }
};
