export async function fetchModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google API error: ${res.status} ${err}`);
  }

  const json = await res.json();
  const models = json.models || [];

  // Known Google Pricing per 1k tokens (USD) - Standard tier (not free tier)
  const knownPricing = {
    'models/gemini-1.5-pro': { in: 0.00125, out: 0.005 }, // <128k context prices
    'models/gemini-1.5-flash': { in: 0.000075, out: 0.0003 },
    'models/gemini-1.5-flash-8b': { in: 0.0000375, out: 0.00015 },
    'models/gemini-2.0-flash-exp': { in: 0, out: 0 },
    'models/gemini-2.0-pro-exp-02-05': { in: 0, out: 0 },
    'models/gemini-2.5-pro': { in: 0.00125, out: 0.005 }, // Estimating based on previous
  };

  return models.map(m => {
    // Determine context window from inputTokenLimit if available
    const contextWindow = m.inputTokenLimit || 2000000;
    
    // For Gemini, model names look like 'models/gemini-1.5-pro'
    // We can use the full name as model_id
    const modelId = m.name;
    const prices = knownPricing[modelId] || { in: 0, out: 0 };
    
    return {
      provider: 'google',
      model_id: modelId,
      input_cost_per_1k: prices.in,
      output_cost_per_1k: prices.out,
      context_window: contextWindow,
    };
  });
}
