export async function fetchModels() {
  // ElevenLabs sometimes works without API key for public endpoints
  const headers = {};
  if (process.env.ELEVENLABS_API_KEY) {
    headers['xi-api-key'] = process.env.ELEVENLABS_API_KEY;
  }

  const res = await fetch('https://api.elevenlabs.io/v1/models', { headers });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs API error: ${res.status} ${err}`);
  }

  const models = await res.json();

  return models.map(m => {
    return {
      provider: 'elevenlabs',
      model_id: m.model_id,
      input_cost_per_1k: 0, // Generally character based
      output_cost_per_1k: 0,
      context_window: null,
    };
  });
}
