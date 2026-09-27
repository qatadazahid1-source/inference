export async function fetchModels() {
  const apiKey = process.env.REKA_API_KEY;
  if (!apiKey) throw new Error('REKA_API_KEY is not set');

  const res = await fetch('https://api.reka.ai/v1/models', {
    headers: {
      'X-Api-Key': apiKey,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Reka API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  return models.map(m => {
    return {
      provider: 'reka',
      model_id: m.id,
      input_cost_per_1k: 0,
      output_cost_per_1k: 0,
      context_window: 128000,
    };
  });
}
