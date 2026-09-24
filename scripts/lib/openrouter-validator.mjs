/**
 * OpenRouter Validator
 *
 * Validates normalized model objects before writing to disk.
 * Models that fail validation are excluded from output and logged.
 */

/**
 * Validates a single normalized model.
 * @param {object} model
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateModel(model) {
  if (!model || typeof model !== 'object') {
    return { valid: false, reason: 'Not an object' };
  }

  if (!model.provider || typeof model.provider !== 'string') {
    return { valid: false, reason: 'Missing or invalid "provider"' };
  }

  if (!model.name || typeof model.name !== 'string') {
    return { valid: false, reason: 'Missing or invalid "name"' };
  }

  if (!model.model_id || typeof model.model_id !== 'string') {
    return { valid: false, reason: 'Missing or invalid "model_id"' };
  }

  // context_length can be null (API may not provide it), but must not be a non-number if set
  if (model.context_length !== null && typeof model.context_length !== 'number') {
    return { valid: false, reason: '"context_length" must be a number or null' };
  }

  if (!model.pricing || typeof model.pricing !== 'object') {
    return { valid: false, reason: 'Missing "pricing" object' };
  }

  if (typeof model.pricing.input !== 'number') {
    return { valid: false, reason: '"pricing.input" must be a number' };
  }

  if (typeof model.pricing.output !== 'number') {
    return { valid: false, reason: '"pricing.output" must be a number' };
  }

  if (!model.capabilities || typeof model.capabilities !== 'object') {
    return { valid: false, reason: 'Missing "capabilities" object' };
  }

  if (!model.last_sync || typeof model.last_sync !== 'string') {
    return { valid: false, reason: 'Missing or invalid "last_sync"' };
  }

  return { valid: true };
}

/**
 * Validates an array of normalized models.
 * @param {object[]} models
 * @returns {{ valid: object[], invalid: { model_id: string, reason: string }[] }}
 */
export function validateModels(models) {
  const valid = [];
  const invalid = [];

  for (const model of models) {
    const result = validateModel(model);
    if (result.valid) {
      valid.push(model);
    } else {
      invalid.push({ model_id: model?.model_id ?? '(unknown)', reason: result.reason });
    }
  }

  return { valid, invalid };
}
