export async function fetchModels() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const res = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  // Known OpenAI Pricing per 1k tokens (USD)
  const knownPricing = {
    'gpt-4o': { in: 0.0025, out: 0.010, cache: 0.00125 },
    'gpt-4o-2024-11-20': { in: 0.0025, out: 0.010, cache: 0.00125 },
    'gpt-4o-2024-08-06': { in: 0.0025, out: 0.010, cache: 0.00125 },
    'gpt-4o-2024-05-13': { in: 0.005, out: 0.015 },
    'gpt-4o-mini': { in: 0.00015, out: 0.0006, cache: 0.000075 },
    'gpt-4o-mini-2024-07-18': { in: 0.00015, out: 0.0006, cache: 0.000075 },
    'o1': { in: 0.015, out: 0.060, cache: 0.0075 },
    'o1-2024-12-17': { in: 0.015, out: 0.060, cache: 0.0075 },
    'o1-mini': { in: 0.003, out: 0.012, cache: 0.0015 },
    'o1-mini-2024-09-12': { in: 0.003, out: 0.012, cache: 0.0015 },
    'o3-mini': { in: 0.0011, out: 0.0044, cache: 0.00055 },
    'o3-mini-2025-01-31': { in: 0.0011, out: 0.0044, cache: 0.00055 },
    'gpt-4-turbo': { in: 0.010, out: 0.030 },
    'gpt-4': { in: 0.030, out: 0.060 },
    'gpt-3.5-turbo': { in: 0.0005, out: 0.0015 },
  };

  return models.map(m => {
    const prices = knownPricing[m.id] || { in: 0, out: 0 };
    return {
      provider: 'openai',
      model_id: m.id,
      input_cost_per_1k: prices.in,
      output_cost_per_1k: prices.out,
      context_window: m.id.includes('gpt-4') || m.id.includes('o1') || m.id.includes('o3') ? 128000 : 16384,
    };
  });
}
