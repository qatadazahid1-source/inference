import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const CURATION_FILE = path.join(DATA_DIR, 'benchmark_curation.json');

export const MAX_CURATED_MODELS = 20;

// Providers natively wired into the AI Gateway routing execution path
export const SUPPORTED_GATEWAY_PROVIDERS = new Set([
  'openai',
  'azure',
  'anthropic',
  'google',
  'groq',
  'mistral',
  'cohere',
]);

// ─── Local Persistence Fallback ───────────────────────────────────────────────
// Ensures admin curation survives server restarts even before SQL DDL is run.

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadLocalCuration() {
  try {
    ensureDataDir();
    if (fs.existsSync(CURATION_FILE)) {
      const content = fs.readFileSync(CURATION_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[benchmarkCuration] Could not read local curation file:', err.message);
  }
  return [];
}

function saveLocalCuration(list) {
  try {
    ensureDataDir();
    fs.writeFileSync(CURATION_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.warn('[benchmarkCuration] Could not write local curation file:', err.message);
  }
}

// ─── System-Curated Models (Section A) ────────────────────────────────────────

/**
 * Fetch at most 20 admin-curated premium models from the database.
 * Never downloads the entire ~1,000 model catalog.
 */
export async function getSystemCuratedModels() {
  // 1. Attempt database query using is_benchmark_featured column
  try {
    const { data, error } = await supabase
      .from('model_pricing')
      .select('id, provider, model, input_cost_per_1k, output_cost_per_1k, context_window, access_tier, is_active, is_benchmark_featured, benchmark_rank')
      .eq('is_active', true)
      .eq('is_benchmark_featured', true)
      .order('benchmark_rank', { ascending: true, nullsFirst: false })
      .order('provider', { ascending: true })
      .limit(MAX_CURATED_MODELS);

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.slice(0, MAX_CURATED_MODELS).map((m, idx) => ({
        id: m.id,
        provider: m.provider,
        model: m.model,
        input_cost_per_1k: Number(m.input_cost_per_1k) || 0,
        output_cost_per_1k: Number(m.output_cost_per_1k) || 0,
        context_window: m.context_window || null,
        access_tier: m.access_tier || 'basic',
        is_active: m.is_active,
        is_benchmark_featured: true,
        benchmark_rank: m.benchmark_rank || idx + 1,
        source: 'system_curated',
      }));
    }
  } catch (err) {
    // Column may not yet exist in remote schema cache; proceed to local store / verified seed
  }

  // 2. Check local curation store if admins have manually curated entries
  const localList = loadLocalCuration();
  if (localList.length > 0) {
    const modelIds = localList.map(item => item.id).filter(Boolean);
    if (modelIds.length > 0) {
      const { data: dbModels } = await supabase
        .from('model_pricing')
        .select('id, provider, model, input_cost_per_1k, output_cost_per_1k, context_window, access_tier, is_active')
        .in('id', modelIds)
        .eq('is_active', true);

      if (dbModels && dbModels.length > 0) {
        const dbMap = new Map(dbModels.map(m => [m.id, m]));
        const ordered = [];
        for (const item of localList) {
          const dbRow = dbMap.get(item.id);
          if (dbRow) {
            ordered.push({
              id: dbRow.id,
              provider: dbRow.provider,
              model: dbRow.model,
              input_cost_per_1k: Number(dbRow.input_cost_per_1k) || 0,
              output_cost_per_1k: Number(dbRow.output_cost_per_1k) || 0,
              context_window: dbRow.context_window || null,
              access_tier: dbRow.access_tier || 'basic',
              is_active: dbRow.is_active,
              is_benchmark_featured: true,
              benchmark_rank: item.rank || ordered.length + 1,
              source: 'system_curated',
            });
          }
          if (ordered.length >= MAX_CURATED_MODELS) break;
        }
        if (ordered.length > 0) return ordered;
      }
    }
  }

  // 3. Fallback seed: query top verified active models with valid pricing across major providers (max 20)
  const { data: fallbackModels, error: fbError } = await supabase
    .from('model_pricing')
    .select('id, provider, model, input_cost_per_1k, output_cost_per_1k, context_window, access_tier, is_active')
    .eq('is_active', true)
    .gt('input_cost_per_1k', 0)
    .gt('output_cost_per_1k', 0)
    .in('provider', ['openai', 'anthropic', 'google', 'groq'])
    .order('provider', { ascending: true })
    .order('model', { ascending: true })
    .limit(MAX_CURATED_MODELS);

  if (fbError || !fallbackModels) {
    console.error('[benchmarkCuration] Fallback fetch error:', fbError?.message);
    return [];
  }

  // Rank and save initial seed so it is stable
  const initialCurated = fallbackModels.slice(0, MAX_CURATED_MODELS).map((m, idx) => ({
    id: m.id,
    provider: m.provider,
    model: m.model,
    input_cost_per_1k: Number(m.input_cost_per_1k) || 0,
    output_cost_per_1k: Number(m.output_cost_per_1k) || 0,
    context_window: m.context_window || null,
    access_tier: m.access_tier || 'basic',
    is_active: m.is_active,
    is_benchmark_featured: true,
    benchmark_rank: idx + 1,
    source: 'system_curated',
  }));

  saveLocalCuration(initialCurated.map(m => ({ id: m.id, rank: m.benchmark_rank })));
  return initialCurated;
}

// ─── User-Added Approved Models (Section B) ───────────────────────────────────

/**
 * Fetch models submitted by the current user or organization that have been
 * approved by an admin and are eligible for Benchmark use.
 * Pending and rejected entries are filtered out.
 */
export async function getUserAddedModels(userId, orgId) {
  if (!userId && !orgId) return [];

  try {
    let query = supabase
      .from('user_model_submissions')
      .select(`
        id,
        submitted_by,
        organization_id,
        provider,
        model_id,
        display_name,
        docs_url,
        context_window,
        input_cost_per_1k,
        output_cost_per_1k,
        pricing_components,
        status,
        rejection_reason,
        reviewed_at,
        approved_model_pricing_id,
        created_at,
        updated_at
      `)
      .eq('status', 'approved'); // CRITICAL: strictly approved submissions only

    if (orgId) {
      query = query.or(`organization_id.eq.${orgId},submitted_by.eq.${userId}`);
    } else {
      query = query.eq('submitted_by', userId);
    }

    const { data: submissions, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    if (!submissions || submissions.length === 0) return [];

    // Verify catalog pricing and provider routing
    // Gather canonical model_pricing row IDs or (provider, model)
    const approvedPricingIds = submissions
      .map(s => s.approved_model_pricing_id)
      .filter(Boolean);

    let catalogMap = new Map();
    if (approvedPricingIds.length > 0) {
      const { data: catalogRows } = await supabase
        .from('model_pricing')
        .select('id, provider, model, input_cost_per_1k, output_cost_per_1k, is_active, context_window')
        .in('id', approvedPricingIds);

      (catalogRows || []).forEach(row => catalogMap.set(row.id, row));
    }

    const seenKeys = new Set();
    const result = [];

    for (const sub of submissions) {
      const uniqueKey = `${sub.provider.toLowerCase().trim()}:${sub.model_id.trim()}`;
      if (seenKeys.has(uniqueKey)) continue; // Deduplicate
      seenKeys.add(uniqueKey);

      const firstComp = Array.isArray(sub.pricing_components) ? sub.pricing_components[0] : null;
      const isCustomRate = firstComp?.pricing_type === 'custom_rate' || sub.notes?.includes('[Custom Rate]');

      // If this submission was approved as a custom organization rate, prioritize its custom pricing;
      // otherwise use the canonical catalog rate.
      const inputCost = (isCustomRate && Number(sub.input_cost_per_1k) > 0)
        ? Number(sub.input_cost_per_1k)
        : (catalogRow?.input_cost_per_1k !== undefined ? Number(catalogRow.input_cost_per_1k) : Number(sub.input_cost_per_1k) || 0);

      const outputCost = (isCustomRate && Number(sub.output_cost_per_1k) > 0)
        ? Number(sub.output_cost_per_1k)
        : (catalogRow?.output_cost_per_1k !== undefined ? Number(catalogRow.output_cost_per_1k) : Number(sub.output_cost_per_1k) || 0);

      const hasValidPricing = (inputCost > 0 || outputCost > 0);
      const isRoutingSupported = SUPPORTED_GATEWAY_PROVIDERS.has(sub.provider.toLowerCase().trim());
      const isActive = catalogRow ? catalogRow.is_active : true;

      const isUsable = hasValidPricing && isRoutingSupported && isActive;
      let usabilityNote = 'Ready for benchmarking';
      if (!isRoutingSupported) {
        usabilityNote = `Gateway routing adapter pending for provider "${sub.provider}"`;
      } else if (!hasValidPricing) {
        usabilityNote = 'Pricing verification required in catalog';
      } else if (!isActive) {
        usabilityNote = 'Model currently marked inactive in pricing catalog';
      }

      result.push({
        id: sub.id,
        submission_id: sub.id,
        approved_model_pricing_id: sub.approved_model_pricing_id || null,
        provider: sub.provider.toLowerCase().trim(),
        model: sub.model_id.trim(),
        display_name: sub.display_name || sub.model_id,
        docs_url: sub.docs_url || null,
        context_window: catalogRow?.context_window || sub.context_window || null,
        input_cost_per_1k: inputCost,
        output_cost_per_1k: outputCost,
        pricing_components: sub.pricing_components || [],
        is_usable: isUsable,
        is_routing_supported: isRoutingSupported,
        usability_note: usabilityNote,
        approved_at: sub.reviewed_at || sub.updated_at,
        created_at: sub.created_at,
        source: 'user_added',
      });
    }

    return result;
  } catch (err) {
    console.error('[benchmarkCuration] getUserAddedModels error:', err.message);
    return [];
  }
}

// ─── Admin Curation Management ────────────────────────────────────────────────

/**
 * Feature or unfeature a model in the Benchmark section with an optional rank.
 * Enforces maximum of 20 featured models.
 */
export async function setModelCuration({ modelPricingId, isFeatured, rank = null }) {
  if (!modelPricingId) throw new Error('modelPricingId is required');

  // Load current curated list to check limit
  const currentCurated = await getSystemCuratedModels();
  const currentlyFeaturedIds = new Set(currentCurated.map(m => m.id));

  if (isFeatured && !currentlyFeaturedIds.has(modelPricingId)) {
    if (currentlyFeaturedIds.size >= MAX_CURATED_MODELS) {
      throw new Error(`Cannot feature more than ${MAX_CURATED_MODELS} models in the Benchmark section. Please unfeature an existing model first.`);
    }
  }

  // Update in database (graceful if column not yet added)
  let dbSuccess = false;
  try {
    const updatePayload = {
      is_benchmark_featured: Boolean(isFeatured),
      updated_at: new Date().toISOString(),
    };
    if (isFeatured && rank) {
      updatePayload.benchmark_rank = parseInt(rank, 10);
    } else if (!isFeatured) {
      updatePayload.benchmark_rank = null;
    }

    const { error } = await supabase
      .from('model_pricing')
      .update(updatePayload)
      .eq('id', modelPricingId);

    if (!error) dbSuccess = true;
  } catch (err) {
    console.warn('[benchmarkCuration] DB column update skipped/failed:', err.message);
  }

  // Update local fallback persistence
  let localList = loadLocalCuration();
  if (isFeatured) {
    const existingIndex = localList.findIndex(item => item.id === modelPricingId);
    const assignedRank = rank || (existingIndex >= 0 ? localList[existingIndex].rank : localList.length + 1);
    if (existingIndex >= 0) {
      localList[existingIndex].rank = assignedRank;
    } else {
      localList.push({ id: modelPricingId, rank: assignedRank });
    }
  } else {
    localList = localList.filter(item => item.id !== modelPricingId);
  }
  // Sort and re-normalize ranks
  localList.sort((a, b) => (a.rank || 99) - (b.rank || 99));
  localList = localList.slice(0, MAX_CURATED_MODELS).map((item, idx) => ({ ...item, rank: idx + 1 }));
  saveLocalCuration(localList);

  return { success: true, dbSuccess, featuredCount: localList.length };
}

/**
 * Re-order all featured models as an admin.
 */
export async function reorderCuratedModels(orderedModelIds) {
  if (!Array.isArray(orderedModelIds)) throw new Error('orderedModelIds must be an array');
  if (orderedModelIds.length > MAX_CURATED_MODELS) {
    throw new Error(`Maximum ${MAX_CURATED_MODELS} models can be featured in Benchmark.`);
  }

  const list = orderedModelIds.map((id, idx) => ({ id, rank: idx + 1 }));
  saveLocalCuration(list);

  // Attempt DB update if column exists
  for (const item of list) {
    try {
      await supabase
        .from('model_pricing')
        .update({ is_benchmark_featured: true, benchmark_rank: item.rank, updated_at: new Date().toISOString() })
        .eq('id', item.id);
    } catch (_) {}
  }

  return { success: true, total: list.length };
}
