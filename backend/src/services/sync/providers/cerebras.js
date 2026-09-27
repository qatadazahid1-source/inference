export async function fetchModels() {
  const res = await fetch('https://api.cerebras.ai/public/v1/models');

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cerebras API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  // Cerebras has very low latency pricing, usually fixed or very low
  // Known prices USD per 1M tokens
  const knownPricing = {
    'llama3.1-8b': { in: 0.10, out: 0.10 },
    'llama3.1-70b': { in: 0.60, out: 0.60 },
  };

  return models.map(m => {
    // prices are usually $0.10 per 1m for 8b and $0.60 for 70b, so 0.0001 and 0.0006 per 1k
    const prices = knownPricing[m.id] || { in: 0, out: 0 };
    return {
      provider: 'cerebras',
      model_id: m.id,
      input_cost_per_1k: prices.in / 1000,
      output_cost_per_1k: prices.out / 1000,
      context_window: 8192,
    };
  });
}
