/**
 * Source Priority Configuration
 * 
 * Controls which data source is trusted more when the same provider+model
 * appears from multiple sources with conflicting prices.
 * 
 * Higher priority = more trusted.
 * Lower priority source NEVER overwrites higher priority source automatically.
 * 
 * This is NOT about which price is cheaper — it's about which source is more authoritative.
 */

export const SOURCE_PRIORITY = {
  direct_provider:  100,  // Official provider API (e.g. calling OpenAI /v1/models directly)
  official_catalog:  90,  // Official provider pricing page JSON/catalog
  groq:              85,  // Groq direct API (direct provider, own infrastructure)
  pricepertoken:     80,  // Price Per Token MCP aggregator
  openrouter:        70,  // OpenRouter aggregated pricing
  portkey:           65,  // Portkey GitHub pricing repository
  other:             50,  // Uncategorized sources
  manual:            40,  // Admin manually entered
};

export const SOURCE_NAMES = {
  direct_provider:  'Direct Provider API',
  official_catalog: 'Official Pricing Catalog',
  groq:             'Groq Direct API',
  pricepertoken:    'Price Per Token MCP',
  openrouter:       'OpenRouter',
  portkey:          'Portkey GitHub',
  other:            'Other',
  manual:           'Manual Entry',
};

/**
 * Get the numeric priority for a source type.
 * Returns 50 (default "other") if unknown.
 */
export function getPriority(sourceType) {
  return SOURCE_PRIORITY[sourceType] ?? SOURCE_PRIORITY.other;
}

/**
 * Determine if incomingSource has higher trust than existingSource.
 * Returns true if we SHOULD prefer the incoming data.
 */
export function isHigherPriority(incomingSourceType, existingSourceType) {
  return getPriority(incomingSourceType) > getPriority(existingSourceType);
}

/**
 * Determine if two sources have the same priority (trust level).
 */
export function isSamePriority(sourceTypeA, sourceTypeB) {
  return getPriority(sourceTypeA) === getPriority(sourceTypeB);
}
