export async function fetchModels() {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) throw new Error('TOGETHER_API_KEY is not set');

  const res = await fetch('https://api.together.xyz/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Together API error: ${res.status} ${err}`);
  }

  const models = await res.json();

  return models.map(m => {
    // Pricing in Together API is sometimes returned in pricing object.
    const inputCostPer1k = m.pricing?.input ? (m.pricing.input * 1000) : 0;
    const outputCostPer1k = m.pricing?.output ? (m.pricing.output * 1000) : 0;

    return {
      provider: 'together',
      model_id: m.id,
      input_cost_per_1k: inputCostPer1k,
      output_cost_per_1k: outputCostPer1k,
      context_window: m.context_length || null,
    };
  });
}
