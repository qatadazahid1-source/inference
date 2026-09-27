export async function fetchModels() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY is not set');

  const res = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  return models.map(m => {
    return {
      provider: 'dashscope',
      model_id: m.model_name || m.name || m.id,
      input_cost_per_1k: 0,
      output_cost_per_1k: 0,
      context_window: null,
    };
  });
}
