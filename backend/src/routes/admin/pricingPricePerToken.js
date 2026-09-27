/**
 * PricePerToken MCP Sync Routes
 * 
 * Implements the Fetch → Preview → Apply workflow for Price Per Token data.
 * 
 * Endpoints:
 *   POST /api/admin/pricing/pricepertoken/fetch    → fetch to staging, return import_id + summary
 *   GET  /api/admin/pricing/pricepertoken/diff/:importId  → get full diff/classification
 *   POST /api/admin/pricing/pricepertoken/apply/:importId → apply to DB
 *   POST /api/admin/pricing/pricepertoken/cancel/:importId → discard staging
 *   GET  /api/admin/pricing/pricepertoken/imports  → list recent imports (last 10)
 */

import express from 'express';
import { supabase } from '../../index.js';
import * as pricePerToken from '../../services/sync/providers/pricepertoken.js';
import {
  fetchToStaging,
  buildDiff,
  applyDiff,
  cancelImport,
  getImportSummary,
} from '../../services/sync/importEngine.js';

const router = express.Router();

// ─── POST /fetch ─────────────────────────────────────────────────────────────
// Fetch from PricePerToken MCP → write to staging → return importId + summary
// Does NOT touch model_pricing.
router.post('/fetch', async (req, res) => {
  try {
    console.log('[PricePerToken Route] Starting fetch...');

    // Step 1: Fetch to staging
    const stagingResult = await fetchToStaging(
      pricePerToken,           // adapter with fetchModels()
      'pricepertoken',         // source_type
      'Price Per Token MCP',  // source_name
      supabase
    );

    // Step 2: Build diff immediately so UI can show preview
    const diffResult = await buildDiff(stagingResult.importId, supabase);

    res.json({
      success: true,
      importId: stagingResult.importId,
      fetch: stagingResult,
      diff: diffResult,
    });
  } catch (err) {
    console.error('[PricePerToken Route] Fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /diff/:importId ──────────────────────────────────────────────────────
// Get the full diff detail for an import (with per-row data)
router.get('/diff/:importId', async (req, res) => {
  const { importId } = req.params;

  try {
    const summary = await getImportSummary(importId, supabase);
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('[PricePerToken Route] Diff error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /apply/:importId ────────────────────────────────────────────────────
// Apply the diff to the production database.
// Body: { applyNew: boolean, applyChanges: boolean, applyConflicts: boolean }
router.post('/apply/:importId', async (req, res) => {
  const { importId } = req.params;
  const {
    applyNew = true,
    applyChanges = true,
    applyConflicts = false,  // NEVER auto-apply conflicts
  } = req.body || {};

  try {
    const report = await applyDiff(importId, supabase, {
      applyNew,
      applyChanges,
      applyConflicts,
      changedBy: req.user?.id || 'SYSTEM',
    });

    res.json({ success: true, report });
  } catch (err) {
    console.error('[PricePerToken Route] Apply error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /cancel/:importId ───────────────────────────────────────────────────
// Cancel an import — delete all staging rows, NO production changes
router.post('/cancel/:importId', async (req, res) => {
  const { importId } = req.params;

  try {
    const result = await cancelImport(importId, supabase);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[PricePerToken Route] Cancel error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /imports ─────────────────────────────────────────────────────────────
// List recent import sessions (last 20, grouped by import_id)
router.get('/imports', async (req, res) => {
  try {
    // Get distinct import IDs with summary stats
    const { data, error } = await supabase
      .from('pricing_import_staging')
      .select('import_id, source_type, source_name, fetched_at, status')
      .eq('source_type', 'pricepertoken')
      .order('fetched_at', { ascending: false })
      .limit(2000);

    if (error) throw error;

    // Group by import_id
    const importMap = new Map();
    for (const row of data || []) {
      if (!importMap.has(row.import_id)) {
        importMap.set(row.import_id, {
          importId: row.import_id,
          sourceType: row.source_type,
          sourceName: row.source_name,
          fetchedAt: row.fetched_at,
          counts: { new: 0, same: 0, changed: 0, conflict: 0, duplicate: 0, invalid: 0, applied: 0, skipped: 0, pending: 0 },
        });
      }
      const imp = importMap.get(row.import_id);
      const statusKey = row.status || 'pending';
      if (imp.counts[statusKey] !== undefined) {
        imp.counts[statusKey]++;
      }
    }

    const imports = [...importMap.values()].slice(0, 20);
    res.json({ success: true, imports });
  } catch (err) {
    console.error('[PricePerToken Route] Imports list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
