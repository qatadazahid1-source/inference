export async function fetchModels() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY is not set');

  const res = await fetch('https://api.x.ai/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`xAI API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  // Known xAI Pricing per 1k tokens (USD)
  const knownPricing = {
    'grok-2-1212': { in: 0.002, out: 0.010 },
    'grok-2': { in: 0.002, out: 0.010 },
    'grok-2-vision-1212': { in: 0.002, out: 0.010 },
    'grok-2-vision': { in: 0.002, out: 0.010 },
    'grok-beta': { in: 0.005, out: 0.015 },
    'grok-vision-beta': { in: 0.005, out: 0.015 },
  };

  return models.map(m => {
    const prices = knownPricing[m.id] || { in: 0, out: 0 };
    return {
      provider: 'xai',
      model_id: m.id,
      input_cost_per_1k: prices.in,
      output_cost_per_1k: prices.out,
      context_window: 131072,
    };
  });
}
