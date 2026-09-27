export async function fetchModels() {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) throw new Error('COHERE_API_KEY is not set');

  const res = await fetch('https://api.cohere.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cohere API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.models || [];

  // Known Cohere Pricing per 1k tokens (USD)
  const knownPricing = {
    'command-r-plus': { in: 0.003, out: 0.015 },
    'command-r-plus-08-2024': { in: 0.003, out: 0.015 },
    'command-r': { in: 0.0005, out: 0.0015 },
    'command-r-08-2024': { in: 0.0005, out: 0.0015 },
    'command': { in: 0.001, out: 0.002 },
    'command-light': { in: 0.0003, out: 0.0006 },
  };

  return models.map(m => {
    const prices = knownPricing[m.name] || { in: 0, out: 0 };
    return {
      provider: 'cohere',
      model_id: m.name,
      input_cost_per_1k: prices.in,
      output_cost_per_1k: prices.out,
      context_window: m.context_length || 128000,
    };
  });
}
