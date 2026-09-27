export async function fetchModels() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not set');

  const res = await fetch('https://api.deepgram.com/v1/models', {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.models || [];

  return models.map(m => {
    return {
      provider: 'deepgram',
      model_id: m.name,
      input_cost_per_1k: 0,
      output_cost_per_1k: 0,
      context_window: null,
    };
  });
}
