#!/usr/bin/env node
/**
 * Unified Pricing/Model Sync Script
 * Usage:
 *   npm run sync:pricing -- anthropic
 *   npm run sync:pricing -- all
 */

import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables from both root and backend
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

import { runProviderSync } from '../backend/src/services/sync/syncManager.js';

// Dynamically import adapters
const adapters = {
  anthropic: () => import('../backend/src/services/sync/providers/anthropic.js'),
  'azure-openai': () => import('../backend/src/services/sync/providers/azure_openai.js'),
  'bedrock-mantle': () => import('../backend/src/services/sync/providers/bedrock_mantle.js'),
  bedrock: () => import('../backend/src/services/sync/providers/bedrock.js'),
  cerebras: () => import('../backend/src/services/sync/providers/cerebras.js'),
  cohere: () => import('../backend/src/services/sync/providers/cohere.js'),
  dashscope: () => import('../backend/src/services/sync/providers/dashscope.js'),
  deepgram: () => import('../backend/src/services/sync/providers/deepgram.js'),
  deepinfra: () => import('../backend/src/services/sync/providers/deepinfra.js'),
  deepseek: () => import('../backend/src/services/sync/providers/deepseek.js'),
  elevenlabs: () => import('../backend/src/services/sync/providers/elevenlabs.js'),
  google: () => import('../backend/src/services/sync/providers/google.js'),
  minimax: () => import('../backend/src/services/sync/providers/minimax.js'),
  openai: () => import('../backend/src/services/sync/providers/openai.js'),
  reka: () => import('../backend/src/services/sync/providers/reka.js'),
  together: () => import('../backend/src/services/sync/providers/together.js'),
  xai: () => import('../backend/src/services/sync/providers/xai.js'),
};

async function main() {
  const args = process.argv.slice(2);
  const targetProvider = args[0]?.toLowerCase();

  if (!targetProvider) {
    console.error('Usage: npm run sync:pricing -- <provider> | all');
    console.error('Available providers:');
    Object.keys(adapters).forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }

  const providersToRun = targetProvider === 'all' ? Object.keys(adapters) : [targetProvider];

  console.log('\n==========================================');
  console.log('       ORDISUM • UNIFIED PRICING SYNC');
  console.log('==========================================\n');

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const provider of providersToRun) {
    if (!adapters[provider]) {
      console.error(`\n[!] Unknown provider: ${provider}`);
      failCount++;
      continue;
    }

    try {
      console.log(`\n--- Syncing ${provider} ---`);
      const module = await adapters[provider]();
      const result = await runProviderSync(provider, module);
      console.log(`[Success] ${provider}: ${result.modelsFetched} models fetched, ${result.modelsUpdated} updated, ${result.modelsInserted} inserted, ${result.modelsActivated} activated, ${result.modelsDeactivated} deactivated.`);
      results.push({ provider, status: 'SUCCESS', ...result });
      successCount++;
    } catch (err) {
      console.error(`[Error] Failed to sync ${provider}:`, err.message);
      results.push({ provider, status: 'FAILED', error: err.message });
      failCount++;
    }
  }

  console.log('\n==========================================');
  console.log('SYNC COMPLETE');
  console.log('==========================================');
  console.log(`Successful: ${successCount}`);
  console.log(`Failed    : ${failCount}`);
  console.log('==========================================\n');

  // Print summary table
  console.log('Summary:');
  results.forEach(r => {
    if (r.status === 'SUCCESS') {
      console.log(`${r.provider.padEnd(15)} | OK     | Found: ${r.modelsFetched} | Updates: ${r.modelsUpdated} | New: ${r.modelsInserted} | Inactive: ${r.modelsDeactivated}`);
    } else {
      console.log(`${r.provider.padEnd(15)} | FAILED | Reason: ${r.error}`);
    }
  });

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('\nSYNC FAILED FATALLY\n');
  console.error(err);
  process.exitCode = 1;
});
