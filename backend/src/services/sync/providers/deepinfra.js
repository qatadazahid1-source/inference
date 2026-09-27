export async function fetchModels() {
  const res = await fetch('https://api.deepinfra.com/models/list');

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepInfra API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  // It returns an array directly
  const models = Array.isArray(json) ? json : [];

  return models.map(m => {
    // pricing object might be embedded in DeepInfra
    // They usually provide price in cents or USD per token
    // If not, we set to 0. 
    // They have pricing fields like pricing: { cents_per_token_in, cents_per_token_out }
    const inputCostPer1k = m.pricing?.cents_per_token_in ? (m.pricing.cents_per_token_in * 1000) / 100 : 0;
    const outputCostPer1k = m.pricing?.cents_per_token_out ? (m.pricing.cents_per_token_out * 1000) / 100 : 0;

    return {
      provider: 'deepinfra',
      model_id: m.model_name,
      input_cost_per_1k: inputCostPer1k,
      output_cost_per_1k: outputCostPer1k,
      context_window: m.context_length || null,
    };
  });
}
