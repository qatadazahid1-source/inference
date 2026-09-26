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

  console.log(`[OpenRouter Sync] Done. ${models.length} models.`);

  res.json({
    success: true,
    logs,
    summary: { count: models.length },
    generated_at: new Date().toISOString(),
    models,
  });
};

export const applyOpenRouterSyncToDB = async (req, res) => {
  console.log('[OpenRouter Sync] Applying pricing to database...');

  try {
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

    const fetchedModels = rawData.map(m => ({
      provider: m.provider,
      model: m.model_id,
      input_cost_per_1k: perTokenToPer1k(m.pricing?.input) ?? 0,
      output_cost_per_1k: perTokenToPer1k(m.pricing?.output) ?? 0,
      context_window: m.context_length,
    }));

    if (fetchedModels.length === 0) {
      return res.status(400).json({ success: false, error: 'Fetched data is empty.' });
    }

    // 2. Fetch current DB models
    let dbModels = [];
    let from = 0;
    let limit = 1000;
    let hasMore = true;
    while(hasMore) {
      const { data, error: fetchErr } = await supabase
        .from('model_pricing')
        .select('id, provider, model, input_cost_per_1k, output_cost_per_1k')
        .range(from, from + limit - 1);
      if (fetchErr) throw fetchErr;
      if (data.length === 0) {
        hasMore = false;
      } else {
        dbModels = dbModels.concat(data);
        if (data.length < limit) hasMore = false;
        from += limit;
      }
    }

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
        const existingIn = existing.input_cost_per_1k ?? 0;
        const existingOut = existing.output_cost_per_1k ?? 0;
        const fetchedIn = fm.input_cost_per_1k;
        const fetchedOut = fm.output_cost_per_1k;

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
        toInsert.push({
          provider: fm.provider,
          model: fm.model,
          input_cost_per_1k: fm.input_cost_per_1k,
          output_cost_per_1k: fm.output_cost_per_1k,
          context_window: fm.context_window,
          is_active: true,
        });
      }
    }

    // 4. Perform bulk operations
    let updatedCount = 0;
    let insertedCount = 0;

    if (toInsert.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { error: insErr } = await supabase.from('model_pricing').insert(chunk);
        if (insErr) throw insErr;
        insertedCount += chunk.length;
      }
    }

    if (toUpdate.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const chunk = toUpdate.slice(i, i + chunkSize);
        const { error: updErr } = await supabase.from('model_pricing').upsert(chunk, { onConflict: 'id' });
        if (updErr) throw updErr;
        updatedCount += chunk.length;
      }
    }

    console.log(`[OpenRouter DB Apply] Done. Inserted: ${insertedCount}, Updated: ${updatedCount}`);

    res.json({
      success: true,
      insertedCount,
      updatedCount,
      totalProcessed: fetchedModels.length,
    });

  } catch (error) {
    console.error('[OpenRouter DB Apply] Error:', error.message);
    res.status(500).json({ success: false, error: 'Database apply failed: ' + error.message });
  }
};
