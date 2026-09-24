#!/usr/bin/env node
/**
 * OpenRouter Model Sync
 *
 * Usage:
 *   npm run sync:models
 *   npm run sync:models -- --dry-run
 *   npm run sync:models -- --verbose
 *
 * Source:
 *   https://openrouter.ai/api/v1/models
 *
 * PRICING UNITS (OpenRouter API):
 *   pricing.prompt            = USD per token  (e.g. 0.000003 = $3.00 per 1M tokens)
 *   pricing.completion        = USD per token
 *   pricing.input_cache_read  = USD per token
 *   pricing.input_cache_write = USD per token
 *
 *   Prices are stored in their ORIGINAL unit: USD per token.
 *   data/models.md displays them as USD per 1M tokens for human readability.
 *
 * FAILURE BEHAVIOUR:
 *   If sync fails, existing data/models.json, data/models.md, and data/sync-meta.json
 *   are NOT overwritten. Temp files are written first and swapped atomically.
 */

import { fetchOpenRouterModels } from './lib/openrouter-fetcher.mjs';
import { normalizeModels } from './lib/openrouter-normalizer.mjs';
import { validateModels } from './lib/openrouter-validator.mjs';
import { deduplicateModels, sortModels, compareModels } from './lib/openrouter-utils.mjs';
import { writeModelsJson, writeModelsMarkdown, writeSyncMeta, loadExistingModels } from './lib/openrouter-writer.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

async function main() {
  const syncTimestamp = new Date().toISOString();

  console.log('');
  console.log('========================================');
  console.log(' OpenRouter Model Sync');
  if (DRY_RUN) console.log(' [DRY RUN - no files will be written]');
  console.log('========================================');
  console.log('');
  console.log('Source:');
  console.log('https://openrouter.ai/api/v1/models');
  console.log('');

  // 1. Fetch
  console.log('Fetching models...');
  let rawModels;
  try {
    rawModels = await fetchOpenRouterModels();
    console.log('✓ API response received');
    if (VERBOSE) console.log(`  Raw models in response: ${rawModels.length}`);
  } catch (err) {
    console.error(`✗ Fetch failed: ${err.message}`);
    console.error('Previous data files are untouched.');
    process.exit(1);
  }

  // 2. Normalize
  const { normalized, skipped: normSkipped } = normalizeModels(rawModels, syncTimestamp);
  if (VERBOSE && normSkipped.length > 0) {
    console.log(`  Normalization skips: ${normSkipped.length}`);
    normSkipped.forEach(s => console.log(`    warning Skipped "${s.id}": ${s.reason}`));
  }

  // 3. Validate
  const { valid, invalid } = validateModels(normalized);
  if (invalid.length > 0 && VERBOSE) {
    invalid.forEach(v => console.log(`  warning Invalid: "${v.model_id}": ${v.reason}`));
  }

  // 4. Deduplicate
  const { unique, duplicates } = deduplicateModels(valid);
  if (duplicates.length > 0) {
    duplicates.forEach(d => {
      console.log(`warning Duplicate model detected: ${d}`);
      console.log('  Using the most complete record.');
    });
  }

  // 5. Sort deterministically
  const sorted = sortModels(unique);

  // 6. Compare vs existing
  const existing = await loadExistingModels();
  const { added, updated, removed, unchanged } = compareModels(existing, sorted);

  // 7. Print summary
  const skippedTotal = normSkipped.length + invalid.length;
  console.log('');
  console.log(`Models fetched:    ${rawModels.length}`);
  console.log(`Models accepted:   ${sorted.length}`);
  console.log(`Models skipped:    ${skippedTotal}`);
  console.log(`New models:        ${added.length}`);
  console.log(`Updated models:    ${updated.length}`);
  console.log(`Removed models:    ${removed.length}`);
  console.log(`Unchanged models:  ${unchanged.length}`);

  if (removed.length > 0) {
    console.log('');
    console.log('Removed models:');
    removed.forEach(id => console.log(`  - ${id}`));
  }

  if (DRY_RUN) {
    console.log('');
    console.log('[DRY RUN] No files written.');
    console.log('');
    console.log('========================================');
    return;
  }

  // 8. Write outputs (atomic: tmp -> final)
  console.log('');
  console.log('Output:');
  try {
    await writeModelsJson(sorted);
    console.log('✓ data/models.json');
  } catch (err) {
    console.error(`✗ Failed to write data/models.json: ${err.message}`);
    process.exit(1);
  }

  try {
    await writeModelsMarkdown(sorted, syncTimestamp);
    console.log('✓ data/models.md');
  } catch (err) {
    console.error(`✗ Failed to write data/models.md: ${err.message}`);
    process.exit(1);
  }

  try {
    await writeSyncMeta(sorted.length, syncTimestamp);
    console.log('✓ data/sync-meta.json');
  } catch (err) {
    console.warn(`warning Could not write sync-meta.json: ${err.message}`);
  }

  console.log('');
  console.log('Sync completed successfully.');
  console.log(`Last sync: ${syncTimestamp}`);
  console.log('========================================');
  console.log('');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
