/**
 * Import Engine — Staging-Based Diff System
 * 
 * Implements the safe FETCH → STAGE → DIFF → REVIEW → APPLY pipeline.
 * 
 * Flow:
 *   1. fetchToStaging(adapter, sourceType, sourceName)
 *      → fetch from source, write ALL records to pricing_import_staging
 *      → returns importId (UUID grouping this session)
 * 
 *   2. buildDiff(importId, supabase)
 *      → compare staging rows against model_pricing
 *      → classify each row: new / same / changed / conflict / duplicate / invalid
 *      → update status in staging table
 *      → returns diff summary
 * 
 *   3. applyDiff(importId, supabase, options)
 *      → apply only the safe changes to model_pricing
 *      → create pricing_audit_log entries
 *      → mark staging rows as applied/skipped
 *      → returns final report
 * 
 *   4. cancelImport(importId, supabase)
 *      → delete all staging rows for this importId
 *      → NO production changes
 * 
 * CRITICAL RULES:
 *   - NEVER merge different providers (openai/gpt-x ≠ groq/gpt-x)
 *   - NEVER decide "cheaper = correct"
 *   - NEVER insert duplicates (provider+model+is_active)
 *   - NEVER silently overwrite — always log to audit trail
 */

import crypto from 'node:crypto';
import { getPriority, SOURCE_NAMES } from '../../config/sourcePriority.js';

const CHUNK_SIZE = 500;

// ─── FETCH TO STAGING ────────────────────────────────────────────────────────

/**
 * Fetch all models from an adapter and write to staging.
 * Returns importId and a summary of what was fetched.
 */
export async function fetchToStaging(adapter, sourceType, sourceName, supabase) {
  const importId = crypto.randomUUID();
  const fetchedAt = new Date().toISOString();
  
  console.log(`[ImportEngine] Starting import ${importId} from ${sourceType}...`);

  let rawModels;
  try {
    rawModels = await adapter.fetchModels();
  } catch (err) {
    throw new Error(`Failed to fetch from ${sourceType}: ${err.message}`);
  }

  if (!Array.isArray(rawModels) || rawModels.length === 0) {
    throw new Error(`Adapter ${sourceType} returned no models`);
  }

  console.log(`[ImportEngine] Fetched ${rawModels.length} models from ${sourceType}`);

  return await stageRecords(rawModels, sourceType, sourceName, supabase);
}

/**
 * Stage an array of normalized records.
 * Returns importId and a summary of what was staged.
 */
export async function stageRecords(records, sourceType, sourceName, supabase) {
  const importId = crypto.randomUUID();
  const fetchedAt = new Date().toISOString();
  
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`No records provided for staging from ${sourceType}`);
  }

  // Map adapter output to staging rows
  const stagingRows = [];
  const seenKeys = new Set();

  for (const m of records) {
    // The adapter must provide these fields
    const provider = (m.provider || '').toLowerCase().trim();
    const modelId = (m.model_id || m.model || '').trim();

    if (!provider || !modelId) {
      stagingRows.push({
        import_id: importId,
        provider: provider || 'unknown',
        model: modelId || 'unknown',
        input_cost_per_1k: null,
        output_cost_per_1k: null,
        context_window: null,
        source_type: sourceType,
        source_name: sourceName || SOURCE_NAMES[sourceType] || sourceType,
        source_url: m.source_url || null,
        fetched_at: fetchedAt,
        status: 'invalid',
        conflict_note: 'Missing provider or model ID',
        incoming_priority: getPriority(sourceType),
      });
      continue;
    }

    const key = `${provider}:${modelId}`;
    
    // Detect duplicates within the same fetch
    if (seenKeys.has(key)) {
      stagingRows.push({
        import_id: importId,
        provider,
        model: modelId,
        input_cost_per_1k: m.input_cost_per_1k ?? null,
        output_cost_per_1k: m.output_cost_per_1k ?? null,
        context_window: m.context_window ?? null,
        source_type: sourceType,
        source_name: sourceName || SOURCE_NAMES[sourceType] || sourceType,
        source_url: m.source_url || null,
        fetched_at: fetchedAt,
        status: 'duplicate',
        conflict_note: `Duplicate within import: ${provider}/${modelId}`,
        incoming_priority: getPriority(sourceType),
      });
      continue;
    }
    seenKeys.add(key);

    stagingRows.push({
      import_id: importId,
      provider,
      model: modelId,
      input_cost_per_1k: m.input_cost_per_1k ?? null,
      output_cost_per_1k: m.output_cost_per_1k ?? null,
      context_window: m.context_window ?? null,
      source_type: sourceType,
      source_name: sourceName || SOURCE_NAMES[sourceType] || sourceType,
      source_url: m.source_url || null,
      fetched_at: fetchedAt,
      status: 'pending',
      incoming_priority: getPriority(sourceType),
    });
  }

  // Insert to staging in chunks
  let insertedCount = 0;
  for (let i = 0; i < stagingRows.length; i += CHUNK_SIZE) {
    const chunk = stagingRows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('pricing_import_staging').insert(chunk);
    if (error) throw new Error(`Staging insert failed: ${error.message}`);
    insertedCount += chunk.length;
  }

  console.log(`[ImportEngine] Staged ${insertedCount} rows with import_id ${importId}`);

  const invalidCount = stagingRows.filter(r => r.status === 'invalid').length;
  const duplicateInFetch = stagingRows.filter(r => r.status === 'duplicate').length;
  const pendingCount = stagingRows.filter(r => r.status === 'pending').length;

  return {
    importId,
    sourceType,
    sourceName,
    totalFetched: records.length,
    staged: insertedCount,
    pending: pendingCount,
    invalidInFetch: invalidCount,
    duplicatesInFetch: duplicateInFetch,
  };
}

// ─── BUILD DIFF ───────────────────────────────────────────────────────────────

/**
 * Compare all pending staging rows against the production DB.
 * Updates status of each staging row.
 * Returns a full diff summary.
 */
export async function buildDiff(importId, supabase) {
  console.log(`[ImportEngine] Building diff for import ${importId}...`);

  // Load all staging rows for this import (only pending ones)
  const { data: stagingRows, error: stagingErr } = await supabase
    .from('pricing_import_staging')
    .select('*')
    .eq('import_id', importId)
    .eq('status', 'pending');

  if (stagingErr) throw new Error(`Failed to load staging: ${stagingErr.message}`);
  if (!stagingRows || stagingRows.length === 0) {
    return { message: 'No pending rows to diff', counts: {} };
  }

  // Get all unique providers from staging to fetch relevant DB rows
  const providers = [...new Set(stagingRows.map(r => r.provider))];

  // Load active DB records for these providers
  const dbMap = new Map(); // key: provider:model → db row
  
  for (const provider of providers) {
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('model_pricing')
        .select('id, provider, model, input_cost_per_1k, output_cost_per_1k, source_type, source_name, is_active')
        .eq('provider', provider)
        .eq('is_active', true)
        .range(from, from + 999);

      if (error) throw new Error(`DB fetch error: ${error.message}`);
      if (!data || data.length === 0) { hasMore = false; break; }
      
      for (const row of data) {
        dbMap.set(`${row.provider}:${row.model}`, row);
      }
      
      if (data.length < 1000) hasMore = false;
      from += 1000;
    }
  }

  // Classify each staging row
  const updates = [];
  const counts = {
    new: 0,
    same: 0,
    changed: 0,
    conflict: 0,
    duplicate: 0,
    invalid: 0,
    pending: 0,
  };

  for (const row of stagingRows) {
    const key = `${row.provider}:${row.model}`;
    const dbRecord = dbMap.get(key);

    let newStatus;
    let updatePayload = {
      id: row.id,
    };

    if (!dbRecord) {
      // No existing record — this is new
      newStatus = 'new';
      counts.new++;
    } else {
      // Record exists — compare
      updatePayload.db_record_id = dbRecord.id;
      updatePayload.db_input_cost = dbRecord.input_cost_per_1k;
      updatePayload.db_output_cost = dbRecord.output_cost_per_1k;
      updatePayload.db_source_type = dbRecord.source_type || 'unknown';
      updatePayload.existing_priority = getPriority(dbRecord.source_type || 'other');

      const dbIn = parseFloat(dbRecord.input_cost_per_1k ?? 0);
      const dbOut = parseFloat(dbRecord.output_cost_per_1k ?? 0);
      const incomingIn = row.input_cost_per_1k !== null ? parseFloat(row.input_cost_per_1k) : null;
      const incomingOut = row.output_cost_per_1k !== null ? parseFloat(row.output_cost_per_1k) : null;

      const pricesMatch = 
        (incomingIn === null || Math.abs(incomingIn - dbIn) < 0.0000001) &&
        (incomingOut === null || Math.abs(incomingOut - dbOut) < 0.0000001);

      if (pricesMatch) {
        newStatus = 'same';
        counts.same++;
      } else {
        // Prices differ — check source priority
        const incomingPriority = getPriority(row.source_type);
        const existingPriority = getPriority(dbRecord.source_type || 'other');

        if (incomingPriority > existingPriority) {
          // Higher priority source with different price → CHANGED (recommend update)
          newStatus = 'changed';
          counts.changed++;
          updatePayload.conflict_note = 
            `Incoming source (${row.source_name}, priority ${incomingPriority}) has higher trust than existing ` +
            `(${dbRecord.source_name || dbRecord.source_type || 'unknown'}, priority ${existingPriority}). ` +
            `DB: $${dbIn}/$${dbOut}  →  Incoming: $${incomingIn}/$${incomingOut}`;
        } else if (incomingPriority < existingPriority) {
          // Lower priority source with different price → CONFLICT (keep existing recommended)
          newStatus = 'conflict';
          counts.conflict++;
          updatePayload.conflict_note = 
            `Incoming source (${row.source_name}, priority ${incomingPriority}) has LOWER trust than existing ` +
            `(${dbRecord.source_name || dbRecord.source_type || 'unknown'}, priority ${existingPriority}). ` +
            `Will NOT auto-overwrite. DB: $${dbIn}/$${dbOut}  vs  Incoming: $${incomingIn}/$${incomingOut}`;
        } else {
          // Same priority — conflict, needs manual resolution
          newStatus = 'conflict';
          counts.conflict++;
          updatePayload.conflict_note = 
            `Both sources have equal priority (${incomingPriority}). Manual review required. ` +
            `DB: $${dbIn}/$${dbOut}  vs  Incoming: $${incomingIn}/$${incomingOut}`;
        }
      }
    }

    updatePayload.status = newStatus;
    updates.push(updatePayload);
  }

  // Batch update staging statuses
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    for (const update of chunk) {
      const { id, ...fields } = update;
      const { error } = await supabase
        .from('pricing_import_staging')
        .update(fields)
        .eq('id', id);
      if (error) {
        console.error(`[ImportEngine] Failed to update staging row ${id}:`, error.message);
      }
    }
  }

  // Also count pre-classified rows (invalid, duplicate from fetch)
  const { data: preClassified } = await supabase
    .from('pricing_import_staging')
    .select('status')
    .eq('import_id', importId)
    .in('status', ['invalid', 'duplicate']);
    
  (preClassified || []).forEach(r => {
    if (r.status === 'invalid') counts.invalid++;
    else if (r.status === 'duplicate') counts.duplicate++;
  });

  console.log(`[ImportEngine] Diff complete:`, counts);

  return {
    importId,
    counts,
    totalPending: stagingRows.length,
  };
}

// ─── APPLY DIFF ───────────────────────────────────────────────────────────────

/**
 * Apply diff results to the production database.
 * 
 * Rules:
 *   'new'     → INSERT into model_pricing
 *   'same'    → do nothing (no change needed)
 *   'changed' → UPDATE model_pricing (higher priority source)
 *   'conflict'→ do NOT auto-apply (mark as skipped unless forceConflicts=true)
 *   'duplicate'/'invalid' → skip
 * 
 * After apply: creates pricing_audit_log entries, marks staging rows as applied/skipped.
 */
export async function applyDiff(importId, supabase, options = {}) {
  const {
    applyNew = true,
    applyChanges = true,
    applyConflicts = false,  // Never auto-apply conflicts by default
    changedBy = 'SYSTEM',
  } = options;

  console.log(`[ImportEngine] Applying import ${importId}...`);
  const now = new Date().toISOString();

  // Load classified staging rows
  const { data: stagingRows, error: loadErr } = await supabase
    .from('pricing_import_staging')
    .select('*')
    .eq('import_id', importId)
    .in('status', ['new', 'same', 'changed', 'conflict']);

  if (loadErr) throw new Error(`Failed to load staging: ${loadErr.message}`);

  const report = {
    importId,
    applied: 0,
    inserted: 0,
    updated: 0,
    kept: 0,      // same price, no action
    skipped: 0,   // conflict or disallowed
    errors: [],
  };

  for (const row of stagingRows) {
    try {
      if (row.status === 'same') {
        // No change needed
        report.kept++;
        await supabase.from('pricing_import_staging').update({ status: 'applied', applied_at: now, applied_by: changedBy }).eq('id', row.id);
        continue;
      }

      if (row.status === 'conflict' && !applyConflicts) {
        // Skip conflict — needs manual review
        report.skipped++;
        await supabase.from('pricing_import_staging').update({ status: 'skipped' }).eq('id', row.id);
        continue;
      }

      if (row.status === 'new' && applyNew) {
        // INSERT new model
        const { data: newRow, error: insErr } = await supabase
          .from('model_pricing')
          .insert({
            provider: row.provider,
            model: row.model,
            input_cost_per_1k: row.input_cost_per_1k ?? 0,
            output_cost_per_1k: row.output_cost_per_1k ?? 0,
            context_window: row.context_window ?? null,
            is_active: true,
            source_type: row.source_type,
            source_name: row.source_name,
            source_url: row.source_url,
            source_fetched_at: row.fetched_at,
            updated_at: now,
          })
          .select()
          .single();

        if (insErr) {
          // Check if it's a duplicate constraint violation
          if (insErr.code === '23505') {
            // Unique constraint violation — already exists (race condition / data inconsistency)
            report.skipped++;
            await supabase.from('pricing_import_staging')
              .update({ status: 'skipped', conflict_note: 'Already exists in DB (constraint violation)' })
              .eq('id', row.id);
            continue;
          }
          throw insErr;
        }

        // Audit log
        await logAuditEntry(supabase, {
          changedBy,
          modelPricingId: newRow.id,
          provider: row.provider,
          modelName: row.model,
          oldInputCost: null,
          oldOutputCost: null,
          newInputCost: row.input_cost_per_1k,
          newOutputCost: row.output_cost_per_1k,
          action: 'created',
          sourceType: row.source_type,
          sourceName: row.source_name,
        });

        await supabase.from('pricing_import_staging').update({ status: 'applied', applied_at: now, applied_by: changedBy }).eq('id', row.id);
        report.inserted++;
        report.applied++;

      } else if (row.status === 'changed' && applyChanges) {
        // UPDATE existing model
        const { error: updErr } = await supabase
          .from('model_pricing')
          .update({
            input_cost_per_1k: row.input_cost_per_1k ?? 0,
            output_cost_per_1k: row.output_cost_per_1k ?? 0,
            source_type: row.source_type,
            source_name: row.source_name,
            source_url: row.source_url,
            source_fetched_at: row.fetched_at,
            updated_at: now,
          })
          .eq('id', row.db_record_id);

        if (updErr) throw updErr;

        // Audit log — preserve old values
        await logAuditEntry(supabase, {
          changedBy,
          modelPricingId: row.db_record_id,
          provider: row.provider,
          modelName: row.model,
          oldInputCost: row.db_input_cost,
          oldOutputCost: row.db_output_cost,
          newInputCost: row.input_cost_per_1k,
          newOutputCost: row.output_cost_per_1k,
          action: 'updated',
          sourceType: row.source_type,
          sourceName: row.source_name,
          oldSourceType: row.db_source_type,
          oldSourceName: row.db_source_type,
        });

        await supabase.from('pricing_import_staging').update({ status: 'applied', applied_at: now, applied_by: changedBy }).eq('id', row.id);
        report.updated++;
        report.applied++;
      } else {
        // Disallowed action (e.g. conflict with applyConflicts=false, or status we don't handle)
        report.skipped++;
        await supabase.from('pricing_import_staging').update({ status: 'skipped' }).eq('id', row.id);
      }
    } catch (err) {
      console.error(`[ImportEngine] Error applying row ${row.id}:`, err.message);
      report.errors.push({
        rowId: row.id,
        provider: row.provider,
        model: row.model,
        error: err.message,
      });
    }
  }

  console.log(`[ImportEngine] Apply complete:`, report);
  return report;
}

// ─── CANCEL IMPORT ────────────────────────────────────────────────────────────

/**
 * Cancel an import — delete all staging rows.
 * No production changes are made.
 */
export async function cancelImport(importId, supabase) {
  const { error, count } = await supabase
    .from('pricing_import_staging')
    .delete()
    .eq('import_id', importId);

  if (error) throw new Error(`Failed to cancel import: ${error.message}`);
  
  console.log(`[ImportEngine] Cancelled import ${importId}, deleted ${count} staging rows`);
  return { importId, deleted: count };
}

// ─── GET IMPORT SUMMARY ───────────────────────────────────────────────────────

/**
 * Get full staging rows for an import, grouped by status.
 */
export async function getImportSummary(importId, supabase) {
  const { data, error } = await supabase
    .from('pricing_import_staging')
    .select('*')
    .eq('import_id', importId)
    .order('status')
    .order('provider')
    .order('model');

  if (error) throw new Error(`Failed to get import summary: ${error.message}`);

  const grouped = {
    new: [],
    same: [],
    changed: [],
    conflict: [],
    duplicate: [],
    invalid: [],
    applied: [],
    skipped: [],
    pending: [],
  };

  for (const row of data || []) {
    const group = grouped[row.status] || grouped.pending;
    group.push({
      provider: row.provider,
      model: row.model,
      input_cost_per_1k: row.input_cost_per_1k,
      output_cost_per_1k: row.output_cost_per_1k,
      source_type: row.source_type,
      source_name: row.source_name,
      db_input_cost: row.db_input_cost,
      db_output_cost: row.db_output_cost,
      db_source_type: row.db_source_type,
      incoming_priority: row.incoming_priority,
      existing_priority: row.existing_priority,
      conflict_note: row.conflict_note,
      status: row.status,
    });
  }

  const counts = {};
  for (const [key, arr] of Object.entries(grouped)) {
    counts[key] = arr.length;
  }

  return { importId, counts, grouped };
}

// ─── AUDIT LOG HELPER ─────────────────────────────────────────────────────────

async function logAuditEntry(supabase, {
  changedBy, modelPricingId, provider, modelName,
  oldInputCost, oldOutputCost, newInputCost, newOutputCost,
  action, sourceType, sourceName, oldSourceType, oldSourceName,
}) {
  try {
    await supabase.from('pricing_audit_log').insert({
      changed_by: changedBy,
      model_pricing_id: modelPricingId,
      provider,
      model_name: modelName,
      old_input_cost: oldInputCost ?? null,
      old_output_cost: oldOutputCost ?? null,
      new_input_cost: newInputCost ?? null,
      new_output_cost: newOutputCost ?? null,
      action,
      source_type: sourceType,
      source_name: sourceName,
      old_source_type: oldSourceType ?? null,
      old_source_name: oldSourceName ?? null,
    });
  } catch (err) {
    console.error('[ImportEngine] Audit log write failed (non-fatal):', err.message);
  }
}
