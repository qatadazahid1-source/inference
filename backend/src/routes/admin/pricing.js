import express from 'express';
import { supabase } from '../../index.js';
import { extractPricingFromUrl } from '../../utils/llmScraper.js';

const router = express.Router();

// ─── Pricing Audit Logger ────────────────────────────────────────────────────
// Inserts a row in pricing_audit_log before returning a response.
// Called by PUT and POST routes. Never throws — audit failure is silent so
// the actual pricing update is not rolled back because of it.
async function logPricingChange({ changedBy, modelPricingId, provider, modelName, oldInputCost, oldOutputCost, newInputCost, newOutputCost, action }) {
  try {
    await supabase.from('pricing_audit_log').insert({
      changed_by: changedBy,
      model_pricing_id: modelPricingId,
      provider,
      model_name: modelName,
      old_input_cost: oldInputCost ?? null,
      old_output_cost: oldOutputCost ?? null,
      new_input_cost: newInputCost,
      new_output_cost: newOutputCost,
      action,
    });
  } catch (err) {
    console.error('[admin/pricing] Audit log write failed (non-fatal):', err.message);
  }
}

// ─── GET /api/admin/pricing ──────────────────────────────────────────────────
// All model_pricing rows, ordered by provider then model name.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('model_pricing')
      .select('*')
      .order('provider', { ascending: true })
      .order('model', { ascending: true });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[admin/pricing] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/pricing/:id ──────────────────────────────────────────────
// Update a specific pricing row by UUID. Logs to pricing_audit_log.
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { input_cost_per_1k, output_cost_per_1k, is_active } = req.body;

  try {
    // Fetch current values for the audit log
    const { data: existing, error: fetchErr } = await supabase
      .from('model_pricing')
      .select('provider, model, input_cost_per_1k, output_cost_per_1k')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Pricing row not found.' });
    }

    const updates = {};
    if (input_cost_per_1k !== undefined) updates.input_cost_per_1k = input_cost_per_1k;
    if (output_cost_per_1k !== undefined) updates.output_cost_per_1k = output_cost_per_1k;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('model_pricing')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Determine action for the audit log
    const action = is_active === false ? 'deactivated' : 'updated';

    await logPricingChange({
      changedBy: req.user.id,
      modelPricingId: id,
      provider: existing.provider,
      modelName: existing.model,
      oldInputCost: existing.input_cost_per_1k,
      oldOutputCost: existing.output_cost_per_1k,
      newInputCost: updates.input_cost_per_1k ?? existing.input_cost_per_1k,
      newOutputCost: updates.output_cost_per_1k ?? existing.output_cost_per_1k,
      action,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/pricing] PUT error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/pricing ─────────────────────────────────────────────────
// Add a new provider+model pricing entry. Logs to pricing_audit_log.
router.post('/', async (req, res) => {
  const { provider, model, input_cost_per_1k, output_cost_per_1k, context_window } = req.body;

  if (!provider || !model || input_cost_per_1k === undefined || output_cost_per_1k === undefined) {
    return res.status(400).json({ error: 'provider, model, input_cost_per_1k, and output_cost_per_1k are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('model_pricing')
      .insert({
        provider,
        model,
        input_cost_per_1k,
        output_cost_per_1k,
        context_window: context_window || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    await logPricingChange({
      changedBy: req.user.id,
      modelPricingId: data.id,
      provider,
      modelName: model,
      oldInputCost: null,
      oldOutputCost: null,
      newInputCost: input_cost_per_1k,
      newOutputCost: output_cost_per_1k,
      action: 'created',
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/pricing] POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/pricing/sync-openrouter ─────────────────────────────────
// Fetches latest pricing from OpenRouter API and updates DB
router.post('/sync-openrouter', async (req, res) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) throw new Error(`OpenRouter API responded with ${response.status}`);
    
    const json = await response.json();
    const allModels = json.data;

    // Fetch active providers from the dynamic ai_providers table
    const { data: activeProviders, error: providerErr } = await supabase
      .from('ai_providers')
      .select('name, provider_id')
      .eq('is_active', true);

    if (providerErr) throw providerErr;

    // Map common dashboard provider IDs to OpenRouter prefixes
    const PREFIX_MAP = {
      'mistral': 'mistralai/',
      'bedrock': 'amazon/',
      'grok': 'x-ai/',
      'x-ai': 'x-ai/',
    };

    const isVariant = (modelId) => {
      return modelId.includes(':free') ||
             modelId.includes(':batch') ||
             modelId.includes(':nitro') ||
             modelId.includes(':extended') ||
             modelId.startsWith('~');
    };

    // Filter models
    let targetModels = [];
    
    for (const provider of activeProviders) {
      const prefix = PREFIX_MAP[provider.provider_id.toLowerCase()] || `${provider.provider_id.toLowerCase()}/`;
      
      let filtered = allModels.filter(m => m.id.toLowerCase().startsWith(prefix) && !isVariant(m.id));
      
      // Calculate costs and add to model object to allow sorting by power/price
      filtered = filtered.map(m => {
        const inputCostPer1k = parseFloat(m.pricing?.prompt || '0') * 1000;
        const outputCostPer1k = parseFloat(m.pricing?.completion || '0') * 1000;
        return {
          ...m,
          providerName: provider.name,
          inputCostPer1k,
          outputCostPer1k,
          totalPrice: inputCostPer1k + outputCostPer1k
        };
      });

      // Sort descending by price (proxy for model power: most powerful first)
      filtered.sort((a, b) => b.totalPrice - a.totalPrice);
      
      // Take only the top 20 models per provider
      const top20 = filtered.slice(0, 20);
      
      targetModels.push(...top20);
    }

    // Fetch existing pricing
    const { data: existingPricing, error: fetchErr } = await supabase
      .from('model_pricing')
      .select('id, provider, model, input_cost_per_1k, output_cost_per_1k');

    if (fetchErr) throw fetchErr;

    const existingMap = new Map();
    for (const row of existingPricing) {
      // Store by model ID. Note: existing provider names might be lowercase
      existingMap.set(row.model, row);
    }

    let updatedCount = 0;
    let insertedCount = 0;

    for (const m of targetModels) {
      const inputCostPer1k = m.inputCostPer1k;
      const outputCostPer1k = m.outputCostPer1k;
      const providerStr = m.providerName;
      const modelId = m.id;

      const existing = existingMap.get(modelId);
      
      if (existing) {
        // Only update if changed
        if (existing.input_cost_per_1k !== inputCostPer1k || existing.output_cost_per_1k !== outputCostPer1k) {
          const { error: updateErr } = await supabase
            .from('model_pricing')
            .update({ 
              input_cost_per_1k: inputCostPer1k, 
              output_cost_per_1k: outputCostPer1k,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
            
          if (!updateErr) {
            updatedCount++;
            await logPricingChange({
              changedBy: req.user.id,
              modelPricingId: existing.id,
              provider: existing.provider,
              modelName: existing.model,
              oldInputCost: existing.input_cost_per_1k,
              oldOutputCost: existing.output_cost_per_1k,
              newInputCost: inputCostPer1k,
              newOutputCost: outputCostPer1k,
              action: 'updated',
            });
          }
        }
      } else {
        // Insert new
        const { data: inserted, error: insertErr } = await supabase
          .from('model_pricing')
          .insert({
            provider: providerStr,
            model: modelId,
            input_cost_per_1k: inputCostPer1k,
            output_cost_per_1k: outputCostPer1k,
            is_active: true,
          })
          .select()
          .single();

        if (!insertErr) {
          insertedCount++;
          await logPricingChange({
            changedBy: req.user.id,
            modelPricingId: inserted.id,
            provider: providerStr,
            modelName: modelId,
            oldInputCost: null,
            oldOutputCost: null,
            newInputCost: inputCostPer1k,
            newOutputCost: outputCostPer1k,
            action: 'created',
          });
        }
      }
    }

    res.json({ success: true, updatedCount, insertedCount, totalProcessed: targetModels.length });
  } catch (err) {
    console.error('[admin/pricing] Sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/pricing/sync-custom-urls ────────────────────────────────
// Fetches pricing from custom provider URLs using an LLM scraping agent
router.post('/sync-custom-urls', async (req, res) => {
  const { providers } = req.body;
  if (!Array.isArray(providers) || providers.length === 0) {
    return res.status(400).json({ error: 'providers array is required' });
  }

  try {
    let updatedCount = 0;
    let insertedCount = 0;
    let failedProviders = [];
    let providerResults = []; // To track per-provider stats

    // Fetch existing pricing once to compare
    const { data: existingPricing, error: fetchErr } = await supabase
      .from('model_pricing')
      .select('id, provider, model, input_cost_per_1k, output_cost_per_1k');

    if (fetchErr) throw fetchErr;

    const existingMap = new Map();
    for (const row of existingPricing) {
      existingMap.set(row.model, row);
    }

    // Process each provider URL
    for (const p of providers) {
      const { providerName, url } = p;
      if (!providerName || !url) continue;

      const result = await extractPricingFromUrl(providerName, url);
      
      if (result.error || !result.data || !Array.isArray(result.data)) {
        failedProviders.push({ providerName, url, error: result.error || 'Invalid LLM response' });
        continue;
      }

      let pUpdated = 0;
      let pInserted = 0;
      let pUnchanged = 0;

      const models = result.data;
      for (const m of models) {
        // Parse prices (remove '$' and convert to float, then convert per 1M to per 1k by dividing by 1000)
        let inPrice1M = parseFloat(m.promptPrice?.replace(/[^0-9.]/g, '') || '0');
        let outPrice1M = parseFloat(m.completionPrice?.replace(/[^0-9.]/g, '') || '0');
        
        const inputCostPer1k = inPrice1M / 1000;
        const outputCostPer1k = outPrice1M / 1000;
        const providerStr = providerName;
        const modelId = m.modelName;

        if (!modelId) continue;

        const existing = existingMap.get(modelId);
        
        if (existing) {
          // Check if prices changed
          if (existing.input_cost_per_1k !== inputCostPer1k || existing.output_cost_per_1k !== outputCostPer1k) {
            const { error: updateErr } = await supabase
              .from('model_pricing')
              .update({ 
                input_cost_per_1k: inputCostPer1k, 
                output_cost_per_1k: outputCostPer1k,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
              
            if (!updateErr) {
              updatedCount++;
              pUpdated++;
              await logPricingChange({
                changedBy: req.user.id,
                modelPricingId: existing.id,
                provider: existing.provider,
                modelName: existing.model,
                oldInputCost: existing.input_cost_per_1k,
                oldOutputCost: existing.output_cost_per_1k,
                newInputCost: inputCostPer1k,
                newOutputCost: outputCostPer1k,
                action: 'updated',
              });
            }
          } else {
            // Prices are the same
            pUnchanged++;
          }
        } else {
          // Insert completely new model
          const { data: inserted, error: insertErr } = await supabase
            .from('model_pricing')
            .insert({
              provider: providerStr,
              model: modelId,
              input_cost_per_1k: inputCostPer1k,
              output_cost_per_1k: outputCostPer1k,
              is_active: true,
            })
            .select()
            .single();

          if (!insertErr) {
            insertedCount++;
            pInserted++;
            await logPricingChange({
              changedBy: req.user.id,
              modelPricingId: inserted.id,
              provider: providerStr,
              modelName: modelId,
              oldInputCost: null,
              oldOutputCost: null,
              newInputCost: inputCostPer1k,
              newOutputCost: outputCostPer1k,
              action: 'created',
            });
          }
        }
      }

      // Add to provider results
      providerResults.push({
        providerName,
        unchanged: pUnchanged,
        updated: pUpdated,
        newModels: pInserted
      });
    }

    res.json({ 
      success: true, 
      updatedCount, 
      insertedCount, 
      providerResults,
      failedProviders 
    });
  } catch (err) {
    console.error('[admin/pricing] Custom URL sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ─── DELETE /api/admin/pricing/:id ───────────────────────────────────────────
// Soft-delete only: sets is_active = false. Never hard-deletes.
// Deactivated models keep all historical cost data intact.
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('model_pricing')
      .select('provider, model, input_cost_per_1k, output_cost_per_1k')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Pricing row not found.' });
    }

    const { data, error } = await supabase
      .from('model_pricing')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logPricingChange({
      changedBy: req.user.id,
      modelPricingId: id,
      provider: existing.provider,
      modelName: existing.model,
      oldInputCost: existing.input_cost_per_1k,
      oldOutputCost: existing.output_cost_per_1k,
      newInputCost: existing.input_cost_per_1k,
      newOutputCost: existing.output_cost_per_1k,
      action: 'deactivated',
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/pricing] DELETE error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/pricing/audit-log ────────────────────────────────────────
// Most recent 50 entries from pricing_audit_log with the changer's email.
router.get('/audit-log', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pricing_audit_log')
      .select(`
        id,
        provider,
        model_name,
        old_input_cost,
        old_output_cost,
        new_input_cost,
        new_output_cost,
        action,
        changed_at,
        changed_by
      `)
      .order('changed_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const userIds = [...new Set((data || []).map(r => r.changed_by).filter(Boolean))];
    let usersById = new Map();
    if (userIds.length > 0) {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);
      if (!usersErr && users) {
        usersById = new Map(users.map(u => [u.id, u]));
      }
    }

    // Flatten the joined user data for easier frontend consumption
    const mapped = (data || []).map((row) => {
      const user = usersById.get(row.changed_by);
      return {
        id: row.id,
        provider: row.provider,
        model_name: row.model_name,
        old_input_cost: row.old_input_cost,
        old_output_cost: row.old_output_cost,
        new_input_cost: row.new_input_cost,
        new_output_cost: row.new_output_cost,
        action: row.action,
        changed_at: row.changed_at,
        changed_by_email: user?.email ?? 'Unknown',
        changed_by_name: user?.full_name ?? '',
      };
    });

    res.json({ data: mapped });
  } catch (err) {
    console.error('[admin/pricing] GET /audit-log error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
