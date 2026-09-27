import { execFile } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabase } from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Project root is 3 levels up from backend/src/controllers/
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'sync-models.mjs');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'data', 'models.json');

/**
 * Converts USD per token → USD per 1K tokens
 * e.g. 0.000003 → 0.003
 */
function perTokenToPer1k(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Number((value * 1000).toFixed(10));
}

import { stageRecords, buildDiff, applyDiff, getImportSummary } from '../services/sync/importEngine.js';

export const runOpenRouterSync = async (req, res) => {
  console.log('[OpenRouter Sync] Starting sync...');

  try {
    await access(SCRIPT_PATH);
  } catch {
    return res.status(500).json({
      success: false,
      error: `Sync script not found at: ${SCRIPT_PATH}`,
    });
  }

  // Run the sync script and collect its output
  const logs = await new Promise((resolve, reject) => {
    const collectedLogs = [];

    execFile(
      process.execPath, // node binary
      [SCRIPT_PATH, '--verbose'],
      {
        cwd: PROJECT_ROOT,
        timeout: 120_000, // 2 minutes max
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (stdout) collectedLogs.push(...stdout.split('\n').filter(Boolean));
        if (stderr) collectedLogs.push(...stderr.split('\n').filter(Boolean).map(l => `[ERR] ${l}`));

        if (error) {
          reject(new Error(`Script failed (exit ${error.code}): ${error.message}\n${stderr}`));
        } else {
          resolve(collectedLogs);
        }
      }
    );
  }).catch(err => {
    throw err;
  });

  // Read generated JSON
  let rawData;
  try {
    const jsonText = await readFile(OUTPUT_PATH, 'utf8');
    rawData = JSON.parse(jsonText);
  } catch (err) {
    return res.status(500).json({
      success: false,
      logs,
      error: `Failed to read generated pricing data: ${err.message}`,
    });
  }

  // Build clean model list
  const models = rawData.map(m => ({
    provider: m.provider,
    model: m.model_id,
    input_usd_per_1k:       perTokenToPer1k(m.pricing?.input),
    output_usd_per_1k:      perTokenToPer1k(m.pricing?.output),
    cache_read_usd_per_1k:  perTokenToPer1k(m.pricing?.cache_read),
    cache_write_usd_per_1k: perTokenToPer1k(m.pricing?.cache_write),
    context_length: m.context_length,
    capabilities: m.capabilities
  }));

  console.log(`[OpenRouter Sync] Fetched ${models.length} models. Normalizing and staging...`);

  const normalizedRecords = rawData.map(m => ({
    provider: m.provider,
    model_id: m.model_id,
    input_cost_per_1k: perTokenToPer1k(m.pricing?.input) ?? 0,
    output_cost_per_1k: perTokenToPer1k(m.pricing?.output) ?? 0,
    context_window: m.context_length,
  }));

  let stageResult, diffResult, summary;
  try {
    stageResult = await stageRecords(normalizedRecords, 'openrouter', 'OpenRouter API', supabase);
    diffResult = await buildDiff(stageResult.importId, supabase);
    summary = await getImportSummary(stageResult.importId, supabase);
  } catch (err) {
    console.error('[OpenRouter Sync] Staging/diff failed:', err.message);
    return res.status(500).json({
      success: false,
      logs,
      error: `Staging/diff failed: ${err.message}`,
    });
  }

  res.json({
    success: true,
    logs,
    summary: { count: models.length },
    generated_at: new Date().toISOString(),
    models,
    importId: stageResult.importId,
    diffCounts: diffResult.counts,
  });
};

export const applyOpenRouterSyncToDB = async (req, res) => {
  console.log('[OpenRouter Sync] Applying pricing to database...');

  let { importId } = req.body || {};

  try {
    if (!importId) {
      console.log('[OpenRouter Sync] No importId provided. Re-staging from JSON file for backward compatibility...');
      let rawData;
      try {
        const jsonText = await readFile(OUTPUT_PATH, 'utf8');
        rawData = JSON.parse(jsonText);
      } catch (err) {
        return res.status(500).json({
          success: false,
          error: `No synced data found. Please run 'openrouter sync' first. (${err.message})`,
        });
      }

      const normalizedRecords = rawData.map(m => ({
        provider: m.provider,
        model_id: m.model_id,
        input_cost_per_1k: perTokenToPer1k(m.pricing?.input) ?? 0,
        output_cost_per_1k: perTokenToPer1k(m.pricing?.output) ?? 0,
        context_window: m.context_length,
      }));

      if (normalizedRecords.length === 0) {
        return res.status(400).json({ success: false, error: 'Fetched data is empty.' });
      }

      const stageResult = await stageRecords(normalizedRecords, 'openrouter', 'OpenRouter API', supabase);
      await buildDiff(stageResult.importId, supabase);
      importId = stageResult.importId;
    }

    const report = await applyDiff(importId, supabase, {
      applyNew: true,
      applyChanges: true,
      applyConflicts: false,
      changedBy: req.user?.id || 'SYSTEM',
    });

    console.log(`[OpenRouter DB Apply] Done. Applied: ${report.applied}`);

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
    console.error('[OpenRouter DB Apply] Error:', error.message);
    res.status(500).json({ success: false, error: 'Database apply failed: ' + error.message });
  }
};
