export const chartTheme = {
  primary: '#CCFF00', // Signal Chartreuse for primary series / CTAs
  grid: 'rgba(255, 255, 255, 0.04)',
  text: '#909090',
  border: '#222222',
  surface: '#0A0A0A',
  raised: '#111111',
};

const knownProviderColors: Record<string, string> = {
  openai: '#CCFF00',    // Chartreuse
  gpt: '#CCFF00',
  anthropic: '#E0E0E0', // Silver
  claude: '#E0E0E0',
  google: '#909090',    // Slate
  gemini: '#909090',
  cohere: '#666666',    // Mid Slate
  mistral: '#AAAAAA',   // Light Slate
  meta: '#888888',
  llama: '#888888',
};

const fallbackSlateScale = [
  '#CCFF00',
  '#E0E0E0',
  '#909090',
  '#666666',
  '#AAAAAA',
  '#888888',
  '#BBBBBB',
  '#777777',
];

/**
 * Deterministically return a stable color for a given provider or model name.
 * Prevents color shuffling when provider order changes.
 */
export function getProviderColor(providerName: string): string {
  const normalized = (providerName || '').toLowerCase().trim();

  for (const [key, color] of Object.entries(knownProviderColors)) {
    if (normalized.includes(key)) {
      return color;
    }
  }

  // Hash fallback for unlisted provider strings
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % fallbackSlateScale.length;
  return fallbackSlateScale[index];
}
