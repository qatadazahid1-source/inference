/**
 * OpenRouter Utilities
 *
 * Provides: deduplication, sorting, and change-detection (comparison).
 */

/**
 * Deduplicates models by model_id.
 * Keeps the first occurrence (after sort by completeness) and logs duplicates.
 *
 * @param {object[]} models
 * @returns {{ unique: object[], duplicates: string[] }}
 */
export function deduplicateModels(models) {
  const seen = new Map();
  const duplicates = [];

  for (const model of models) {
    const key = model.model_id;
    if (seen.has(key)) {
      duplicates.push(key);
      // Keep the "more complete" record: prefer the one with more non-null pricing fields
      const existing = seen.get(key);
      const existingScore = completenessScore(existing);
      const incomingScore = completenessScore(model);
      if (incomingScore > existingScore) {
        seen.set(key, model);
      }
    } else {
      seen.set(key, model);
    }
  }

  return {
    unique: Array.from(seen.values()),
    duplicates,
  };
}

/**
 * Scores a model record by how many useful fields are non-null.
 * Used to prefer more complete records during deduplication.
 *
 * @param {object} model
 * @returns {number}
 */
function completenessScore(model) {
  let score = 0;
  if (model.context_length != null) score++;
  if (model.pricing?.input > 0) score++;
  if (model.pricing?.output > 0) score++;
  if (model.pricing?.cache_read != null) score++;
  if (model.pricing?.cache_write != null) score++;
  return score;
}

/**
 * Sorts models deterministically:
 *   Primary: provider (ascending, alphabetical)
 *   Secondary: name (ascending, alphabetical)
 *
 * @param {object[]} models
 * @returns {object[]}
 */
export function sortModels(models) {
  return [...models].sort((a, b) => {
    const providerCmp = a.provider.localeCompare(b.provider);
    if (providerCmp !== 0) return providerCmp;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Compares a new list of models against a previously-synced list.
 * Uses model_id as the identity key.
 * Does NOT count last_sync changes as meaningful updates.
 *
 * @param {object[]} previous - Previously saved models (from disk)
 * @param {object[]} current  - Newly fetched and normalized models
 * @returns {{ added: string[], updated: string[], removed: string[], unchanged: string[] }}
 */
export function compareModels(previous, current) {
  const prevMap = new Map(previous.map(m => [m.model_id, m]));
  const currMap = new Map(current.map(m => [m.model_id, m]));

  const added = [];
  const updated = [];
  const unchanged = [];
  const removed = [];

  // Check current vs previous
  for (const [id, curr] of currMap) {
    if (!prevMap.has(id)) {
      added.push(id);
    } else {
      const prev = prevMap.get(id);
      if (hasChanged(prev, curr)) {
        updated.push(id);
      } else {
        unchanged.push(id);
      }
    }
  }

  // Check for removed models
  for (const id of prevMap.keys()) {
    if (!currMap.has(id)) {
      removed.push(id);
    }
  }

  return { added, updated, removed, unchanged };
}

/**
 * Determines if meaningful data changed between two versions of the same model.
 * Explicitly excludes last_sync from comparison.
 *
 * @param {object} prev
 * @param {object} curr
 * @returns {boolean}
 */
function hasChanged(prev, curr) {
  // Compare non-timestamp fields
  if (prev.provider !== curr.provider) return true;
  if (prev.name !== curr.name) return true;
  if (prev.context_length !== curr.context_length) return true;

  // Compare pricing
  const pp = prev.pricing || {};
  const cp = curr.pricing || {};
  if (pp.input !== cp.input) return true;
  if (pp.output !== cp.output) return true;
  if (pp.cache_read !== cp.cache_read) return true;
  if (pp.cache_write !== cp.cache_write) return true;

  // Compare capabilities
  const pc = prev.capabilities || {};
  const cc = curr.capabilities || {};
  const capKeys = ['text', 'image', 'audio', 'video', 'tools', 'reasoning'];
  for (const key of capKeys) {
    if (pc[key] !== cc[key]) return true;
  }

  return false;
}
