import express from 'express';
import { supabase } from '../index.js';

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrganizationIdForUser(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (error) throw new Error(`Could not resolve organization for user ${userId}: ${error.message}`);
  return data.organization_id;
}

// Normalize a price entered by the user to per-1k tokens.
// Unit is either 'per_1k' or 'per_1m'. Always returns a number.
function normalizeTo1k(pricePerUnit, unit) {
  const p = parseFloat(pricePerUnit);
  if (!isFinite(p)) return null;
  if (unit === 'per_1m') return p / 1000;
  return p; // already per_1k
}

// ─── Provider Submissions ─────────────────────────────────────────────────────

// GET /api/submissions/providers — my org's provider submissions
router.get('/providers', async (req, res) => {
  try {
    const orgId = await getOrganizationIdForUser(req.user.id);
    const { data, error } = await supabase
      .from('user_provider_submissions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[submissions/providers] GET error:', err.message);
    res.status(500).json({ error: 'Failed to load provider submissions.' });
  }
});

// POST /api/submissions/providers — submit a new provider
router.post('/providers', async (req, res) => {
  const { name, provider_id, website_url, docs_url, base_url, protocol, notes } = req.body;

  if (!name?.trim() || !provider_id?.trim()) {
    return res.status(400).json({ error: 'name and provider_id are required.' });
  }

  // Slug-validate provider_id: lowercase letters, digits, hyphens only
  if (!/^[a-z0-9-]+$/.test(provider_id.trim())) {
    return res.status(400).json({ error: 'provider_id must contain only lowercase letters, digits, and hyphens.' });
  }

  try {
    const orgId = await getOrganizationIdForUser(req.user.id);

    // Check for duplicate pending or approved submission from this org
    const { data: existing } = await supabase
      .from('user_provider_submissions')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('provider_id', provider_id.trim().toLowerCase())
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({ error: 'A pending submission for this provider already exists from your organization.' });
      }
      return res.status(409).json({ error: 'This provider is already available for your organization.' });
    }

    // Check against live catalog
    const { data: liveProvider } = await supabase
      .from('ai_providers')
      .select('id')
      .eq('provider_id', provider_id.trim().toLowerCase())
      .maybeSingle();

    if (liveProvider) {
      return res.status(409).json({ error: `Provider "${provider_id.trim().toLowerCase()}" already exists in the catalog. You can submit models directly for this provider.` });
    }

    const { data, error } = await supabase
      .from('user_provider_submissions')
      .insert({
        submitted_by:    req.user.id,
        organization_id: orgId,
        name:            name.trim(),
        provider_id:     provider_id.trim().toLowerCase(),
        website_url:     website_url?.trim() || null,
        docs_url:        docs_url?.trim()    || null,
        base_url:        base_url?.trim()    || null,
        protocol:        protocol            || null,
        notes:           notes?.trim()       || null,
        status:          'pending',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[submissions/providers] POST error:', err.message);
    res.status(500).json({ error: 'Failed to submit provider.' });
  }
});

// ─── Model Submissions ────────────────────────────────────────────────────────

// GET /api/submissions/models — my org's model submissions
router.get('/models', async (req, res) => {
  try {
    const orgId = await getOrganizationIdForUser(req.user.id);
    const { data, error } = await supabase
      .from('user_model_submissions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[submissions/models] GET error:', err.message);
    res.status(500).json({ error: 'Failed to load model submissions.' });
  }
});

// POST /api/submissions/models — submit a new model
router.post('/models', async (req, res) => {
  const {
    provider,
    model_id,
    display_name,
    docs_url,
    context_window,
    pricing_components, // Array of { component_type, unit, price_per_unit }
    pricing_type = 'custom_rate', // 'custom_rate' | 'global_update'
    notes,
  } = req.body;

  if (!provider?.trim() || !model_id?.trim() || !display_name?.trim()) {
    return res.status(400).json({ error: 'provider, model_id, and display_name are required.' });
  }

  const validPricingType = pricing_type === 'global_update' ? 'global_update' : 'custom_rate';

  if (!Array.isArray(pricing_components) || pricing_components.length === 0) {
    return res.status(400).json({ error: 'At least one pricing_component is required.' });
  }

  // Validate and normalize pricing components
  const VALID_COMPONENT_TYPES = [
    'input_tokens', 'output_tokens', 'cached_input', 'cache_write',
    'image_generation', 'audio_input', 'audio_output', 'web_search', 'other',
  ];
  const VALID_UNITS = ['per_1k', 'per_1m'];

  for (const comp of pricing_components) {
    if (!VALID_COMPONENT_TYPES.includes(comp.component_type)) {
      return res.status(400).json({ error: `Invalid component_type: ${comp.component_type}` });
    }
    if (!VALID_UNITS.includes(comp.unit)) {
      return res.status(400).json({ error: `Invalid unit: ${comp.unit}. Must be per_1k or per_1m.` });
    }
    if (!isFinite(parseFloat(comp.price_per_unit)) || parseFloat(comp.price_per_unit) < 0) {
      return res.status(400).json({ error: `Invalid price_per_unit for ${comp.component_type}.` });
    }
  }

  // Normalize all components to per-1k for storage
  const normalizedComponents = pricing_components.map(comp => ({
    component_type:   comp.component_type,
    unit:             comp.unit,
    price_per_unit:   parseFloat(comp.price_per_unit),
    normalized_per_1k: normalizeTo1k(comp.price_per_unit, comp.unit),
  }));

  // Convenience denorm columns
  const inputComp  = normalizedComponents.find(c => c.component_type === 'input_tokens');
  const outputComp = normalizedComponents.find(c => c.component_type === 'output_tokens');

  try {
    const orgId = await getOrganizationIdForUser(req.user.id);

    // Duplicate check: has this organization already submitted this model?
    const { data: existing } = await supabase
      .from('user_model_submissions')
      .select('id, status')
      .eq('organization_id', orgId)
      .eq('provider', provider.trim().toLowerCase())
      .eq('model_id', model_id.trim())
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({ error: 'A submission for this model is already pending review for your organization.' });
      }
      return res.status(409).json({ error: 'This model is already active in your organization\'s benchmarks.' });
    }

    // Check if this model already exists in the live model_pricing catalog
    const { data: livePricing } = await supabase
      .from('model_pricing')
      .select('id, input_cost_per_1k, output_cost_per_1k')
      .eq('provider', provider.trim().toLowerCase())
      .eq('model', model_id.trim())
      .eq('is_active', true)
      .maybeSingle();

    const isCatalogModel = Boolean(livePricing);
    let priceDiffDetected = false;
    let catalogPricing = null;

    if (isCatalogModel) {
      const submittedInput = inputComp?.normalized_per_1k ?? 0;
      const submittedOutput = outputComp?.normalized_per_1k ?? 0;
      const catalogInput = Number(livePricing.input_cost_per_1k) || 0;
      const catalogOutput = Number(livePricing.output_cost_per_1k) || 0;

      catalogPricing = {
        input_cost_per_1k: catalogInput,
        output_cost_per_1k: catalogOutput,
      };

      // Check discrepancy (tolerance: $0.000001 per 1k tokens)
      const inputDiff = Math.abs(submittedInput - catalogInput) > 0.000001;
      const outputDiff = Math.abs(submittedOutput - catalogOutput) > 0.000001;
      priceDiffDetected = inputDiff || outputDiff;
    }

    // Auto-approval policy:
    // Only auto-approve if:
    // 1) Model is already an active catalog model, AND
    // 2) User submitted standard global pricing (validPricingType === 'global_update'), AND
    // 3) No price discrepancy was detected (!priceDiffDetected).
    // If the user specified 'custom_rate' OR entered different pricing, route to admin review.
    const autoApprove = isCatalogModel && !priceDiffDetected && validPricingType === 'global_update';
    const status = autoApprove ? 'approved' : 'pending';
    const approvedPricingId = autoApprove ? livePricing.id : null;
    const reviewedAt = autoApprove ? new Date().toISOString() : null;

    // Attach pricing metadata to components
    const componentsWithMeta = normalizedComponents.map(comp => ({
      ...comp,
      pricing_type: validPricingType,
      price_diff_detected: priceDiffDetected,
      catalog_per_1k: comp.component_type === 'input_tokens'
        ? (catalogPricing?.input_cost_per_1k ?? null)
        : (comp.component_type === 'output_tokens' ? (catalogPricing?.output_cost_per_1k ?? null) : null),
    }));

    const typeTag = validPricingType === 'custom_rate' ? '[Custom Rate]' : '[Global Provider Update]';
    const diffTag = priceDiffDetected ? '[Price Difference Detected]' : '';
    const annotatedNotes = [typeTag, diffTag, notes?.trim()].filter(Boolean).join(' ');

    const { data, error } = await supabase
      .from('user_model_submissions')
      .insert({
        submitted_by:              req.user.id,
        organization_id:           orgId,
        provider:                  provider.trim().toLowerCase(),
        model_id:                  model_id.trim(),
        display_name:              display_name.trim(),
        docs_url:                  docs_url?.trim()     || null,
        context_window:            context_window ? parseInt(context_window, 10) : null,
        pricing_components:        componentsWithMeta,
        input_cost_per_1k:         inputComp?.normalized_per_1k  ?? null,
        output_cost_per_1k:        outputComp?.normalized_per_1k ?? null,
        notes:                     annotatedNotes || null,
        status,
        approved_model_pricing_id: approvedPricingId,
        reviewed_at:               reviewedAt,
      })
      .select()
      .single();

    if (error) throw error;

    let responseMessage = 'Model submitted for admin review.';
    if (autoApprove) {
      responseMessage = 'Model verified from catalog and immediately added to your organization\'s benchmarks!';
    } else if (validPricingType === 'custom_rate') {
      responseMessage = 'Custom negotiated rate submitted! An admin will review and verify your organization-specific pricing.';
    } else if (priceDiffDetected) {
      responseMessage = 'Price update detected! An admin will review and verify the new pricing against official provider rates.';
    }

    res.status(201).json({
      success: true,
      data,
      auto_approved: autoApprove,
      pricing_type: validPricingType,
      price_diff_detected: priceDiffDetected,
      message: responseMessage,
    });
  } catch (err) {
    console.error('[submissions/models] POST error:', err.message);
    res.status(500).json({ error: 'Failed to submit model.' });
  }
});

export default router;
