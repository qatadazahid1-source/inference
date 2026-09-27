export async function fetchModels() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not set');

  const res = await fetch('https://api.deepseek.com/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  // Known DeepSeek Pricing per 1k tokens (USD)
  // DeepSeek Chat: Cache hit 0.07/M, Miss 0.27/M, out 1.10/M => 0.00027, 0.0011
  const knownPricing = {
    'deepseek-chat': { in: 0.00027, out: 0.0011 },
    'deepseek-reasoner': { in: 0.00055, out: 0.00219 },
  };

  return models.map(m => {
    const prices = knownPricing[m.id] || { in: 0, out: 0 };
    return {
      provider: 'deepseek',
      model_id: m.id,
      input_cost_per_1k: prices.in,
      output_cost_per_1k: prices.out,
      context_window: 128000,
    };
  });
}
