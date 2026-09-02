import { supabase } from '../index.js';

const FALLBACK_LIMITS = {
  limits: {
    integrations: 0,
    platform_keys: 0,
    alert_rules: 0,
    budget_rules: 0,
    team_members: 0,
    monthly_spend_usd: 0
  },
  usage: {
    warning_threshold_percent: 80
  },
  features: {
    api_gateway: false,
    analytics: false,
    advanced_analytics: false,
    alerts: false,
    budget_manager: false,
    ai_playground: false,
    benchmarks: false,
    roi_calculator: false,
    reports: false,
    csv_export: false,
    pdf_export: false,
    premium_models: false,
    webhooks: false,
    slack_alerts: false,
    cost_spike_detection: false,
    anomaly_detection: false
  },
  rate_limits: {
    requests_per_minute: 0,
    concurrent_requests: 0
  },
  model_access: {
    tier: 'basic'
  }
};

/**
 * Middleware to fetch and attach the current organization's plan limits to the request.
 * It reads the active subscription from the database and joins the plan limits.
 * If no active subscription exists, it provides fallback (Free/Zero) limits.
 */
export const attachEntitlements = async (req, res, next) => {
  try {
    let orgId = req.headers['x-organization-id'];

    if (!orgId && req.user && req.user.id) {
      const { data } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', req.user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (data) {
        orgId = data.organization_id;
      } else {
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', req.user.id)
          .limit(1)
          .maybeSingle();
        if (org) orgId = org.id;
      }
    }

    let rawLimits = null;

    if (orgId) {
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          plans (
            id,
            system_limits
          )
        `)
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('[attachEntitlements] Error fetching subscription:', error.message);
      } else if (sub && sub.plans && sub.plans.system_limits) {
        rawLimits = sub.plans.system_limits;
      }
    }

    // Merge system limits with fallback
    const merged = {
      limits: { ...FALLBACK_LIMITS.limits, ...(rawLimits?.limits || {}) },
      usage: { ...FALLBACK_LIMITS.usage, ...(rawLimits?.usage || {}) },
      features: { ...FALLBACK_LIMITS.features, ...(rawLimits?.features || {}) },
      rate_limits: { ...FALLBACK_LIMITS.rate_limits, ...(rawLimits?.rate_limits || {}) },
      model_access: { ...FALLBACK_LIMITS.model_access, ...(rawLimits?.model_access || {}) },
    };

    req.entitlements = {
      ...merged,
      // Helper methods
      getLimit: (key) => merged.limits[key],
      hasFeature: (key) => !!merged.features[key],
      isUnlimited: (key) => merged.limits[key] === null,
      checkLimit: (key, currentCount) => {
        const limit = merged.limits[key];
        if (limit === null) return true; // Unlimited
        return currentCount < limit;
      }
    };

    next();
  } catch (err) {
    console.error('[attachEntitlements] Exception:', err.message);
    // Provide fallback
    req.entitlements = {
      ...FALLBACK_LIMITS,
      getLimit: (key) => FALLBACK_LIMITS.limits[key],
      hasFeature: (key) => !!FALLBACK_LIMITS.features[key],
      isUnlimited: (key) => FALLBACK_LIMITS.limits[key] === null,
      checkLimit: (key, currentCount) => {
        const limit = FALLBACK_LIMITS.limits[key];
        if (limit === null) return true;
        return currentCount < limit;
      }
    };
    next();
  }
};

// Tier hierarchy for comparing a plan's model_access.tier against a model's access_tier
const TIER_ORDER = { basic: 0, standard: 1, premium: 2, all: 3 };

/**
 * Shared entitlement check: model access-tier gating + monthly spend limit.
 * Used by BOTH the external API gateway (v1.js, via Platform Keys) and the
 * internal dashboard Playground (proxy.js, via a logged-in session) so a
 * Starter-plan user can't reach a premium model or blow past their monthly
 * spend cap just because they used the dashboard instead of the public API.
 *
 * Throws an Error with .isBudgetBlocked or .isEntitlementModelNotAllowed set
 * (same convention already used by callProviderAndLog's other error flags)
 * so both callers' existing catch blocks handle it without changes.
 *
 * Non-blocking on infra failure by design (matches the original v1.js
 * behavior): if the entitlement lookup itself fails (DB hiccup etc.), the
 * request is allowed through rather than hard-failing every AI call.
 */
export async function checkModelAndSpendEntitlement({ supabase, organization_id, provider, model }) {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plans(system_limits)')
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .maybeSingle();

    const limits = sub?.plans?.system_limits || {};
    const planTier = limits.model_access?.tier ?? 'basic';
    const maxSpend = limits.limits?.monthly_spend_usd ?? null;

    const { data: modelPricing } = await supabase
      .from('model_pricing')
      .select('access_tier')
      .eq('provider', provider)
      .eq('model', model)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!modelPricing) {
      const err = new Error(`Model '${model}' is not registered in the system. Request rejected.`);
      err.isEntitlementModelNotAllowed = true;
      throw err;
    }

    const modelTier = modelPricing.access_tier || 'basic';
    const planTierRank = TIER_ORDER[planTier] ?? 0;
    const modelTierRank = TIER_ORDER[modelTier] ?? 0;

    if (modelTierRank > planTierRank) {
      const err = new Error(`Your plan does not include access to ${modelTier} models. Upgrade your plan to use '${model}'.`);
      err.isEntitlementModelNotAllowed = true;
      throw err;
    }

    if (maxSpend !== null) {
      const now = new Date();
      const utcStartOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      const { data: spendData } = await supabase
        .from('api_usage_logs')
        .select('cost_usd')
        .eq('organization_id', organization_id)
        .gte('logged_at', utcStartOfMonth.toISOString());

      const totalSpend = (spendData || []).reduce((sum, r) => sum + (parseFloat(r.cost_usd) || 0), 0);
      const warningThreshold = (limits.usage?.warning_threshold_percent ?? 80) / 100;

      if (totalSpend >= maxSpend) {
        const err = new Error(`Monthly spend limit of $${maxSpend} reached. Upgrade your plan to continue.`);
        err.isBudgetBlocked = true;
        throw err;
      }

      if (totalSpend >= maxSpend * warningThreshold) {
        console.warn(`[entitlements] Org ${organization_id} at ${Math.round((totalSpend / maxSpend) * 100)}% of monthly spend limit ($${totalSpend.toFixed(4)} / $${maxSpend}).`);
      }
    }
  } catch (err) {
    if (err.isBudgetBlocked || err.isEntitlementModelNotAllowed) throw err;
    // Non-blocking: infra failure in the check itself shouldn't fail the AI call
    console.error('[entitlements] Model/spend check failed (non-blocking):', err.message);
  }
}
