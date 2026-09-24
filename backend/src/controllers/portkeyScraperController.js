import { execFile } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

export const runPortkeySync = async (req, res) => {
  console.log('[Portkey Sync] Starting sync from Portkey GitHub...');

  try {
    // Verify script exists
    await access(SCRIPT_PATH);
  } catch {
    return res.status(500).json({
      success: false,
      error: `Sync script not found at: ${SCRIPT_PATH}. Ensure scripts/sync-portkey-pricing.mjs exists.`,
    });
  }

  // Run the sync script and collect its output
  const logs = await new Promise((resolve, reject) => {
    const collectedLogs = [];

    execFile(
      process.execPath, // node binary
      [SCRIPT_PATH, '--out', OUTPUT_PATH],
      {
        cwd: PROJECT_ROOT,
        timeout: 120_000, // 2 minutes max
        maxBuffer: 10 * 1024 * 1024, // 10MB output buffer
      },
      (error, stdout, stderr) => {
        if (stdout) collectedLogs.push(...stdout.split('\n').filter(Boolean));
        if (stderr) collectedLogs.push(...stderr.split('\n').filter(Boolean).map(l => `[ERR] ${l}`));

        if (error && error.code !== 2) {
          // Exit code 2 = some providers failed but partial success (acceptable)
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

  // Convert per 1M → per 1K and build clean model list
  const models = (rawData.models || []).map(m => ({
    provider: m.provider,
    model: m.model,
    input_usd_per_1k:       per1mToPer1k(m.input_usd_per_1m),
    output_usd_per_1k:      per1mToPer1k(m.output_usd_per_1m),
    cache_read_usd_per_1k:  per1mToPer1k(m.cache_read_usd_per_1m),
    cache_write_usd_per_1k: per1mToPer1k(m.cache_write_usd_per_1m),
    audio_input_usd_per_1k: per1mToPer1k(m.audio_input_usd_per_1m),
    audio_output_usd_per_1k:per1mToPer1k(m.audio_output_usd_per_1m),
    currency: m.currency,
  }));

  console.log(`[Portkey Sync] Done. ${models.length} models from ${rawData.summary?.successful_provider_files ?? '?'} providers.`);

  res.json({
    success: true,
    logs,
    summary: rawData.summary,
    generated_at: rawData.generated_at,
    models,
  });
};

export const applyPortkeySyncToDB = async (req, res) => {
  console.log('[Portkey Sync] Applying pricing to database...');

  try {
    // 1. Read the latest generated JSON
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

    const fetchedModels = (rawData.models || []).map(m => ({
      provider: m.provider,
      model: m.model,
      input_usd_per_1k: per1mToPer1k(m.input_usd_per_1m),
      output_usd_per_1k: per1mToPer1k(m.output_usd_per_1m),
      context_window: null, // Portkey sync doesn't fetch context window
    }));

    if (fetchedModels.length === 0) {
      return res.status(400).json({ success: false, error: 'Fetched data is empty.' });
    }

    // 2. Fetch current DB models
    const { data: dbModels, error: fetchErr } = await supabase
      .from('model_pricing')
      .select('id, provider, model, input_cost_per_1k, output_cost_per_1k');

    if (fetchErr) throw fetchErr;

    // Build a map of existing models for fast lookup: key = provider:model
    const dbModelMap = new Map();
    for (const m of dbModels) {
      dbModelMap.set(`${m.provider}:${m.model}`, m);
    }

    const toInsert = [];
    const toUpdate = [];

    // 3. Compare
    for (const fm of fetchedModels) {
      const key = `${fm.provider}:${fm.model}`;
      const existing = dbModelMap.get(key);

      if (existing) {
        // Check if pricing actually changed
        // Treat undefined/null/0 as equivalent if they both mean no cost
        const existingIn = existing.input_cost_per_1k ?? 0;
        const existingOut = existing.output_cost_per_1k ?? 0;
        const fetchedIn = fm.input_usd_per_1k ?? 0;
        const fetchedOut = fm.output_usd_per_1k ?? 0;

        if (existingIn !== fetchedIn || existingOut !== fetchedOut) {
          toUpdate.push({
            id: existing.id,
            provider: fm.provider,
            model: fm.model,
            input_cost_per_1k: fetchedIn,
            output_cost_per_1k: fetchedOut,
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        // Doesn't exist, insert
        toInsert.push({
          provider: fm.provider,
          model: fm.model,
          input_cost_per_1k: fm.input_usd_per_1k ?? 0,
          output_cost_per_1k: fm.output_usd_per_1k ?? 0,
          context_window: null,
          is_active: true,
        });
      }
    }

    // 4. Perform bulk operations
    let updatedCount = 0;
    let insertedCount = 0;

    if (toInsert.length > 0) {
      // Supabase has a max row limit per insert, so chunk it if necessary, but 3800 is usually fine.
      // Chunking by 1000 just in case.
      const chunkSize = 1000;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { error: insErr } = await supabase.from('model_pricing').insert(chunk);
        if (insErr) throw insErr;
        insertedCount += chunk.length;
      }
    }

    if (toUpdate.length > 0) {
      // Supabase bulk update via upsert
      const chunkSize = 1000;
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const chunk = toUpdate.slice(i, i + chunkSize);
        const { error: updErr } = await supabase.from('model_pricing').upsert(chunk, { onConflict: 'id' });
        if (updErr) throw updErr;
        updatedCount += chunk.length;
      }
    }

    console.log(`[Portkey DB Apply] Done. Inserted: ${insertedCount}, Updated: ${updatedCount}`);

    res.json({
      success: true,
      insertedCount,
      updatedCount,
      totalProcessed: fetchedModels.length,
    });

  } catch (error) {
    console.error('[Portkey DB Apply] Error:', error.message);
    res.status(500).json({ success: false, error: 'Database apply failed: ' + error.message });
  }
};
