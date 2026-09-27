export async function fetchModels() {
  const region = process.env.BEDROCK_MANTLE_REGION || 'us-east-1';
  
  // Confirmed live API endpoint from research
  const url = `https://bedrock-mantle.${region}.api.aws/v1/models`;
  
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`Bedrock Mantle API connection error: ${err.message}`);
  }

  if (!res.ok) {
    const errText = await res.text();
    // Sometimes bedrock-mantle requires SigV4 or specific headers
    throw new Error(`Bedrock Mantle API error: ${res.status} ${errText}`);
  }

  const json = await res.json();
  const models = json.data || [];

  return models.map(m => {
    return {
      provider: 'bedrock-mantle',
      model_id: m.id,
      input_cost_per_1k: 0,
      output_cost_per_1k: 0,
      context_window: null,
    };
  });
}
