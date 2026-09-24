/**
 * OpenRouter Normalizer
 *
 * Converts raw OpenRouter API model objects to our internal normalized format.
 *
 * PRICING UNIT: OpenRouter returns USD per token.
 * We store it as-is (USD per token). The writer displays it as USD per 1M tokens.
 *
 * CAPABILITIES: Derived strictly from API metadata:
 *   - text:      always true (all OpenRouter models produce text)
 *   - image:     true if "image" in input_modalities
 *   - audio:     true if "audio" in input_modalities
 *   - video:     true if "video" in input_modalities
 *   - tools:     true if "tools" in supported_parameters
 *   - reasoning: true if model has a non-null "reasoning" block
 *
 * Fields that CANNOT be reliably inferred are set to null/false with a comment.
 */

/**
 * Extracts the provider from a model ID.
 * OpenRouter IDs are typically "provider/model-name".
 * Falls back to "unknown" if the format doesn't match.
 *
 * @param {string} modelId
 * @returns {string}
 */
export function extractProvider(modelId) {
  if (!modelId || typeof modelId !== 'string') return 'unknown';
  const parts = modelId.split('/');
  if (parts.length >= 2) {
    return parts[0].toLowerCase().trim();
  }
  return 'unknown';
}

/**
 * Normalizes pricing from the raw OpenRouter pricing object.
 * All values are in USD per token (the raw OpenRouter unit).
 *
 * @param {object|undefined} rawPricing
 * @returns {{ input: number, output: number, cache_read: number|null, cache_write: number|null }}
 */
export function normalizePricing(rawPricing) {
  if (!rawPricing || typeof rawPricing !== 'object') {
    return { input: 0, output: 0, cache_read: null, cache_write: null };
  }

  const parsePrice = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : null;
  };

  return {
    // prompt = input pricing (USD per token)
    input: parsePrice(rawPricing.prompt) ?? 0,
    // completion = output pricing (USD per token)
    output: parsePrice(rawPricing.completion) ?? 0,
    // cache read pricing — may or may not be present
    cache_read: parsePrice(rawPricing.input_cache_read),
    // cache write pricing — may or may not be present
    cache_write: parsePrice(rawPricing.input_cache_write),
  };
}

/**
 * Normalizes capabilities from API metadata.
 * Only uses fields directly available from the API — never guessed.
 *
 * @param {object} raw - Raw model object from OpenRouter API
 * @returns {object}
 */
export function normalizeCapabilities(raw) {
  const arch = raw.architecture || {};
  const inputModalities = Array.isArray(arch.input_modalities) ? arch.input_modalities : [];
  const supportedParams = Array.isArray(raw.supported_parameters) ? raw.supported_parameters : [];

  return {
    // All OpenRouter models output text
    text: true,
    // Derived from input_modalities field
    image: inputModalities.includes('image'),
    // Derived from input_modalities field
    audio: inputModalities.includes('audio'),
    // Derived from input_modalities field — very rare
    video: inputModalities.includes('video'),
    // Derived from supported_parameters — "tools" means function calling
    tools: supportedParams.includes('tools'),
    // Derived from the presence of a "reasoning" block in the API response
    // null = unclear (reasoning block absent), true = confirmed reasoning model
    reasoning: raw.reasoning != null ? true : null,
  };
}

/**
 * Normalizes a single raw OpenRouter model object.
 *
 * @param {object} raw - Raw model object
 * @param {string} syncTimestamp - ISO 8601 timestamp for this sync run
 * @returns {{ model: object|null, skip: { id: string, reason: string }|null }}
 */
export function normalizeModel(raw, syncTimestamp) {
  if (!raw || typeof raw !== 'object') {
    return { model: null, skip: { id: '(unknown)', reason: 'Not an object' } };
  }

  const id = raw.id;
  if (!id || typeof id !== 'string') {
    return { model: null, skip: { id: String(id ?? '(missing)'), reason: 'Missing or invalid model ID' } };
  }

  const name = raw.name || id;
  const provider = extractProvider(id);
  const contextLength = typeof raw.context_length === 'number' ? raw.context_length : null;
  const pricing = normalizePricing(raw.pricing);
  const capabilities = normalizeCapabilities(raw);

  return {
    model: {
      provider,
      name,
      model_id: id,
      context_length: contextLength,
      pricing,
      capabilities,
      last_sync: syncTimestamp,
    },
    skip: null,
  };
}

/**
 * Normalizes an array of raw models.
 *
 * @param {object[]} rawModels
 * @param {string} syncTimestamp
 * @returns {{ normalized: object[], skipped: { id: string, reason: string }[] }}
 */
export function normalizeModels(rawModels, syncTimestamp) {
  const normalized = [];
  const skipped = [];

  for (const raw of rawModels) {
    const { model, skip } = normalizeModel(raw, syncTimestamp);
    if (model) {
      normalized.push(model);
    } else if (skip) {
      skipped.push(skip);
    }
  }

  return { normalized, skipped };
}
