import { supabase } from '../index.js';

/**
 * Live queries the model_pricing table for the given provider and model name.
 *
 * IMPORTANT: returns `null` if the model has no pricing row in the DB —
 * it does NOT silently guess a fallback rate. The Admin Panel's Pricing
 * page is the single source of truth for billing; a model that isn't
 * priced there must not be billed at a made-up rate. Callers are
 * responsible for blocking the request when this returns null (see
 * aiGateway.js, which checks this BEFORE calling the provider).
 */
export async function getPricingForModel(provider, modelName) {
  const { data, error } = await supabase
    .from('model_pricing')
    .select('input_cost_per_1k, output_cost_per_1k')
    .eq('provider', provider)
    .eq('model', modelName)
    .eq('is_active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`[pricingHelper] Error fetching pricing for ${provider}/${modelName}:`, error.message);
    return null;
  }

  if (!data) {
    console.warn(`[pricingHelper] No pricing configured for ${provider}/${modelName} — request will be blocked.`);
    return null;
  }

  return {
    input_cost_per_1k: Number(data.input_cost_per_1k),
    output_cost_per_1k: Number(data.output_cost_per_1k)
  };
}
