import { supabase } from '../index.js';

/**
 * Normalizes a provider string for loose comparison:
 * Lowercases and removes all spaces, hyphens, underscores, dots.
 * e.g. "OpenAI" -> "openai", "open_ai" -> "openai", "open-ai" -> "openai", "Open AI" -> "openai"
 * "Together AI" -> "togetherai", "together_ai" -> "togetherai", "together-ai" -> "togetherai"
 */
export function normalizeProviderString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[-_\s.]/g, '');
}

/**
 * Known built-in provider aliases for instant resolution
 */
const BUILTIN_PROVIDERS = [
  { slug: 'openai', name: 'OpenAI' },
  { slug: 'anthropic', name: 'Anthropic' },
  { slug: 'google', name: 'Google' },
  { slug: 'groq', name: 'Groq' },
  { slug: 'mistral', name: 'Mistral' },
  { slug: 'cohere', name: 'Cohere' },
  { slug: 'azure', name: 'Azure OpenAI' },
  { slug: 'deepmind', name: 'DeepMind' },
  { slug: 'together', name: 'Together AI' },
  { slug: 'together-ai', name: 'Together AI' },
  { slug: 'perplexity', name: 'Perplexity' },
  { slug: 'deepseek', name: 'DeepSeek' },
  { slug: 'custom', name: 'Custom' },
];

/**
 * Resolves an incoming provider name or slug against known providers
 * in `ai_providers` or built-in providers.
 * Returns the canonical `provider_id` (e.g. "openai") or the normalized slug.
 */
export async function resolveCanonicalProvider(inputProvider) {
  if (!inputProvider || typeof inputProvider !== 'string') return '';
  const raw = inputProvider.trim().toLowerCase();
  const normalizedInput = normalizeProviderString(inputProvider);

  // 1. Check built-in list
  for (const p of BUILTIN_PROVIDERS) {
    if (
      p.slug === raw ||
      normalizeProviderString(p.slug) === normalizedInput ||
      normalizeProviderString(p.name) === normalizedInput
    ) {
      return p.slug;
    }
  }

  // 2. Check ai_providers table in database (fuzzy matching name OR provider_id)
  try {
    const { data: dbProviders } = await supabase
      .from('ai_providers')
      .select('provider_id, name');

    if (Array.isArray(dbProviders)) {
      // First try exact match on provider_id
      const exact = dbProviders.find(p => p.provider_id.toLowerCase() === raw);
      if (exact) return exact.provider_id;

      // Then try normalized match on provider_id or name
      const fuzzy = dbProviders.find(p =>
        normalizeProviderString(p.provider_id) === normalizedInput ||
        normalizeProviderString(p.name) === normalizedInput
      );
      if (fuzzy) return fuzzy.provider_id;
    }
  } catch (err) {
    console.warn('[providerResolver] Error querying ai_providers:', err.message);
  }

  // 3. Fallback: normalize slug (lowercase, replace spaces and underscores with hyphens)
  return raw.replace(/[\s_]+/g, '-');
}
