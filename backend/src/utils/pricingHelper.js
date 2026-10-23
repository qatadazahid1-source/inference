import { supabase } from '../index.js';
import { resolveCanonicalProvider } from './providerResolver.js';

/**
 * Live queries the model_pricing table for the given provider and model name.
 *
 * IMPORTANT: returns `null` if the model has no pricing row in the DB —
 * it does NOT silently guess a fallback rate. The Admin Panel's Pricing
 * page is the single source of truth for billing; a model that isn't
 * priced there must not be billed at a made-up rate. Callers are
 * responsible for blocking the request when this returns null (see
 * aiGateway.js, which checks this BEFORE calling the provider).
 *
 * Also returns `access_tier` so callers can reject requests if the org's
 * plan does not include the required tier. Unknown models (no row) will
 * receive null and must be rejected with ENTITLEMENT_MODEL_NOT_ALLOWED.
 */
export async function getPricingForModel(provider, modelName, organizationId = null) {
  const normProvider = provider ? provider.trim().toLowerCase() : '';
  const normModel = modelName ? modelName.trim() : '';
  const canonicalProvider = await resolveCanonicalProvider(normProvider);
  const providerCandidates = [...new Set([normProvider, canonicalProvider].filter(Boolean))];

  // 1. If an organizationId is supplied, check for an approved custom rate in user_model_submissions
  if (organizationId) {
    try {
      const { data: customSub } = await supabase
        .from('user_model_submissions')
        .select('input_cost_per_1k, output_cost_per_1k')
        .eq('organization_id', organizationId)
        .in('provider', providerCandidates)
        .eq('model_id', normModel)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (customSub && (Number(customSub.input_cost_per_1k) > 0 || Number(customSub.output_cost_per_1k) > 0)) {
        return {
          input_cost_per_1k: Number(customSub.input_cost_per_1k),
          output_cost_per_1k: Number(customSub.output_cost_per_1k),
          access_tier: 'basic',
          is_custom_rate: true,
        };
      }
    } catch (err) {
      console.warn(`[pricingHelper] Error checking custom org pricing for ${provider}/${modelName}:`, err.message);
    }
  }

  // 2. Fallback to global model_pricing catalog
  const { data, error } = await supabase
    .from('model_pricing')
    .select('input_cost_per_1k, output_cost_per_1k, access_tier')
    .in('provider', providerCandidates)
    .eq('model', normModel)
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
    output_cost_per_1k: Number(data.output_cost_per_1k),
    access_tier: data.access_tier || 'basic',
    is_custom_rate: false,
  };
}
