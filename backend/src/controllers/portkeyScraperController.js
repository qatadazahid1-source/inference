import { execFile } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
