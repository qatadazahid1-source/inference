export async function fetchModels() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  // Known Anthropic Pricing per 1k tokens (based on official docs)
  // prices in USD
  const knownPricing = {
    'claude-3-5-sonnet-20241022': { in: 0.003, out: 0.015, cache: 0.0003 },
    'claude-3-5-sonnet-20240620': { in: 0.003, out: 0.015, cache: 0.0003 },
    'claude-3-5-haiku-20241022': { in: 0.0008, out: 0.004, cache: 0.00008 },
    'claude-3-opus-20240229': { in: 0.015, out: 0.075, cache: 0.0015 },
    'claude-3-sonnet-20240229': { in: 0.003, out: 0.015, cache: 0.0003 },
    'claude-3-haiku-20240307': { in: 0.00025, out: 0.00125, cache: 0.000025 },
  };

  return models.map(m => {
    const prices = knownPricing[m.id] || { in: 0, out: 0 };
    return {
      provider: 'anthropic',
      model_id: m.id,
      input_cost_per_1k: prices.in,
      output_cost_per_1k: prices.out,
      context_window: 200000, // standard for Claude 3
    };
  });
}
