/**
 * Pure function to calculate the total cost of a request.
 * Formula: cost = (inputTokens / 1000 * input_cost_per_1k) + (outputTokens / 1000 * output_cost_per_1k)
 * Rounds to 6 decimal places.
 */
export function calculateCost({ inputTokens, outputTokens, pricing }) {
  const inTokens = Number(inputTokens || 0);
  const outTokens = Number(outputTokens || 0);
  
  if (!pricing) {
    return 0;
  }

  // Handle both database naming conventions (input_cost_per_1k / input_price_per_1k)
  const inputRate = Number(pricing.input_cost_per_1k !== undefined ? pricing.input_cost_per_1k : (pricing.input_price_per_1k || 0));
  const outputRate = Number(pricing.output_cost_per_1k !== undefined ? pricing.output_cost_per_1k : (pricing.output_price_per_1k || 0));

  const inputCost = (inTokens / 1000) * inputRate;
  const outputCost = (outTokens / 1000) * outputRate;
  const totalCost = inputCost + outputCost;

  // Round to 6 decimal places
  return Math.round(totalCost * 1e6) / 1e6;
}
