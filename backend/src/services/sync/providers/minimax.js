export async function fetchModels() {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error('MINIMAX_API_KEY is not set');

  const res = await fetch('https://api.minimaxi.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MiniMax API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  return models.map(m => {
    return {
      provider: 'minimax',
      model_id: m.id,
      input_cost_per_1k: 0,
      output_cost_per_1k: 0,
      context_window: null,
    };
  });
}
