export async function fetchModels() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY;

  if (!endpoint || !apiKey) {
    throw new Error('AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY must be set');
  }

  // Ensure endpoint doesn't have trailing slash
  const baseUrl = endpoint.replace(/\/$/, '');

  const res = await fetch(`${baseUrl}/openai/models?api-version=2024-02-15-preview`, {
    headers: {
      'api-key': apiKey,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure OpenAI API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.data || [];

  return models.map(m => {
    return {
      provider: 'azure-openai',
      model_id: m.id,
      input_cost_per_1k: 0,
      output_cost_per_1k: 0,
      context_window: null,
    };
  });
}
