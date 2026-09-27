import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let supabase = null;
function getSupabase() {
  if (supabase) return supabase;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

/**
 * Logs pricing change to audit log
 */
async function logPricingChange({ changedBy, modelPricingId, provider, modelName, oldInputCost, oldOutputCost, newInputCost, newOutputCost, action }) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('pricing_audit_log').insert({
      changed_by: changedBy || 'SYSTEM',
      model_pricing_id: modelPricingId,
      provider,
      model_name: modelName,
      old_input_cost: oldInputCost ?? null,
      old_output_cost: oldOutputCost ?? null,
      new_input_cost: newInputCost ?? null,
      new_output_cost: newOutputCost ?? null,
      action,
    });
  } catch (err) {
    console.error(`[Audit Log Failed] ${err.message}`);
  }
}

export async function runProviderSync(providerName, adapter) {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
  }

  console.log(`[Sync] Starting sync for provider: ${providerName}...`);
  const startTime = Date.now();

  let fetchedModels;
  try {
    fetchedModels = await adapter.fetchModels();
  } catch (err) {
    throw new Error(`Failed to fetch from ${providerName}: ${err.message}`);
  }

  if (!fetchedModels || !Array.isArray(fetchedModels)) {
    throw new Error(`Adapter for ${providerName} did not return a valid array of models.`);
  }

  console.log(`[Sync] ${providerName} returned ${fetchedModels.length} models.`);

  // Load existing models for this provider
  let dbRows = [];
  let from = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await sb
      .from('model_pricing')
      .select('id, model, is_active, input_cost_per_1k, output_cost_per_1k')
      .eq('provider', providerName)
      .range(from, from + limit - 1);
      
    if (error) throw new Error(`Supabase fetch error: ${error.message}`);
    
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      dbRows = dbRows.concat(data);
      if (data.length < limit) hasMore = false;
      from += limit;
    }
  }

  const dbMap = new Map(dbRows.map(r => [r.model, r]));
  let activated = 0, deactivated = 0, inserted = 0, updated = 0, unchanged = 0;
  const now = new Date().toISOString();
  
  const liveSet = new Set();

  for (const fm of fetchedModels) {
    liveSet.add(fm.model_id);
    const existing = dbMap.get(fm.model_id);

    const inputCost = fm.input_cost_per_1k !== undefined ? fm.input_cost_per_1k : 0;
    const outputCost = fm.output_cost_per_1k !== undefined ? fm.output_cost_per_1k : 0;

    if (existing) {
      let needsUpdate = false;
      const updates = {};

      if (!existing.is_active) {
        updates.is_active = true;
        needsUpdate = true;
        activated++;
      }

      if (existing.input_cost_per_1k !== inputCost || existing.output_cost_per_1k !== outputCost) {
        updates.input_cost_per_1k = inputCost;
        updates.output_cost_per_1k = outputCost;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updates.updated_at = now;
        await sb.from('model_pricing').update(updates).eq('id', existing.id);
        
        if (updates.input_cost_per_1k !== undefined || updates.output_cost_per_1k !== undefined) {
          updated++;
          await logPricingChange({
            changedBy: 'SYSTEM',
            modelPricingId: existing.id,
            provider: providerName,
            modelName: fm.model_id,
            oldInputCost: existing.input_cost_per_1k,
            oldOutputCost: existing.output_cost_per_1k,
            newInputCost: inputCost,
            newOutputCost: outputCost,
            action: 'updated',
          });
        }
      } else {
        unchanged++;
      }
    } else {
      // Insert new
      const { data: newRow, error: insErr } = await sb
        .from('model_pricing')
        .insert({
          provider: providerName,
          model: fm.model_id,
          input_cost_per_1k: inputCost,
          output_cost_per_1k: outputCost,
          context_window: fm.context_window || null,
          is_active: true,
        })
        .select()
        .single();

      if (insErr) {
        console.error(`[Sync] Insert error for ${fm.model_id}:`, insErr.message);
      } else if (newRow) {
        inserted++;
        await logPricingChange({
          changedBy: 'SYSTEM',
          modelPricingId: newRow.id,
          provider: providerName,
          modelName: fm.model_id,
          oldInputCost: null,
          oldOutputCost: null,
          newInputCost: inputCost,
          newOutputCost: outputCost,
          action: 'created',
        });
      }
    }
  }

  // Deactivate missing models
  for (const [modelId, row] of dbMap.entries()) {
    if (!liveSet.has(modelId) && row.is_active) {
      await sb.from('model_pricing').update({ is_active: false, updated_at: now }).eq('id', row.id);
      deactivated++;
      await logPricingChange({
        changedBy: 'SYSTEM',
        modelPricingId: row.id,
        provider: providerName,
        modelName: modelId,
        oldInputCost: row.input_cost_per_1k,
        oldOutputCost: row.output_cost_per_1k,
        newInputCost: row.input_cost_per_1k,
        newOutputCost: row.output_cost_per_1k,
        action: 'deactivated',
      });
    }
  }

  const duration = Date.now() - startTime;

  // Save raw snapshot
  try {
    const dataDir = path.resolve(__dirname, '..', '..', '..', '..', 'data', 'provider-sync', 'raw');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, `${providerName}.json`), JSON.stringify(fetchedModels, null, 2));
  } catch (e) {
    console.error(`[Sync] Could not save raw snapshot for ${providerName}:`, e.message);
  }

  return {
    success: true,
    provider: providerName,
    durationMs: duration,
    modelsFetched: fetchedModels.length,
    modelsInserted: inserted,
    modelsUpdated: updated,
    modelsActivated: activated,
    modelsDeactivated: deactivated,
    modelsUnchanged: unchanged
  };
}
