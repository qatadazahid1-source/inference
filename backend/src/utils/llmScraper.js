import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// All available models from the LLM provider, in priority order (best → fallback).
const FREE_MODELS = [
  ...(process.env.LLM_DEFAULT_MODEL ? [process.env.LLM_DEFAULT_MODEL] : []),
  'Atria-Dawn-Preview',
  'zai-org/GLM-5.3-Flash',
  'deepseek-ai/DeepSeek-V4-Flash-0731',
  'MiniMaxAI/MiniMax-M2.7',
  'gpt-4o',
  'gpt-4o-mini',
  'mistralai/mistral-large',
  'meta/llama-3.3-70b-instruct',
];

// Lazy init: OpenAI client is only created when actually needed.
function getOpenAIClient() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY is not set. Please add it to use the AI scraper.');
  }
  return new OpenAI({
    baseURL: process.env.LLM_BASE_URL || 'https://inference.dahl.global/v1',
    apiKey,
  });
}

/**
 * Strategy 1: Jina AI Reader — converts any URL (including SPAs) to clean markdown.
 * Free, no auth required, works great for pricing pages.
 * https://jina.ai/reader/
 */
async function scrapeWithJina(url) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  console.log(`[Scraper] Trying Jina AI Reader for: ${url}`);
  const response = await fetch(jinaUrl, {
    headers: {
      'Accept': 'text/plain',
      'X-Timeout': '30',
      'X-Wait-For-Selector': 'body',
    },
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    throw new Error(`Jina AI returned ${response.status}: ${response.statusText}`);
  }
  const text = await response.text();
  if (!text || text.trim().length < 100) {
    throw new Error('Jina returned empty or too short content');
  }
  console.log(`[Scraper] Jina AI succeeded. Got ${text.length} chars.`);
  return text;
}

/**
 * Strategy 2: Direct HTTP fetch — works for server-rendered pages.
 */
async function scrapeWithFetch(url) {
  console.log(`[Scraper] Trying direct HTTP fetch for: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`HTTP fetch returned ${response.status}`);
  }
  const html = await response.text();
  // Strip HTML tags to get readable text
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (text.length < 100) {
    throw new Error('Direct fetch returned too little content (likely a SPA)');
  }
  console.log(`[Scraper] Direct fetch succeeded. Got ${text.length} chars.`);
  return text;
}

/**
 * Main scrape function: tries Jina first, falls back to direct fetch.
 * No Playwright/Chromium needed — works on any Node.js server including Render.
 */
async function scrapeText(url) {
  // Strategy 1: Jina AI Reader (best for SPAs like portkey.ai)
  try {
    return await scrapeWithJina(url);
  } catch (err) {
    console.warn(`[Scraper] Jina AI failed: ${err.message}. Trying direct fetch...`);
  }

  // Strategy 2: Direct HTTP fetch (good for static/SSR pages)
  try {
    return await scrapeWithFetch(url);
  } catch (err) {
    console.error(`[Scraper] Direct fetch also failed: ${err.message}`);
    return null;
  }
}

/**
 * Tries to call the LLM with automatic fallback across all available models.
 */
async function callLLMWithFallback(openai, messages) {
  let lastError = null;

  for (const model of FREE_MODELS) {
    try {
      console.log(`[Scraper] Trying model: ${model}`);
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0,
      });

      let content = response.choices[0].message.content.trim();

      // Clean up markdown block if the LLM adds it despite instructions
      if (content.startsWith('```json')) {
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
      } else if (content.startsWith('```')) {
        content = content.replace(/```/g, '').trim();
      }

      // Find JSON array in the response (handles leading/trailing text)
      const arrayStart = content.indexOf('[');
      const arrayEnd = content.lastIndexOf(']');
      if (arrayStart !== -1 && arrayEnd !== -1) {
        content = content.substring(arrayStart, arrayEnd + 1);
      }

      const parsed = JSON.parse(content);

      if (!Array.isArray(parsed)) {
        throw new Error(`Expected JSON array but got ${typeof parsed}`);
      }

      console.log(`[Scraper] Model ${model} succeeded. Extracted ${parsed.length} models.`);
      return parsed;
    } catch (err) {
      console.warn(`[Scraper] Model ${model} failed: ${err.message}. Trying next...`);
      lastError = err;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

/**
 * Extracts all models and their prompt/completion pricing from the given URL.
 */
export async function extractPricingFromUrl(providerName, url) {
  try {
    console.log(`[Scraper] Starting extraction for provider "${providerName}": ${url}`);
    const text = await scrapeText(url);
    if (!text) {
      return { error: 'Failed to scrape page — all strategies exhausted' };
    }

    const messages = [
      {
        role: 'user',
        content: `You are a strict data extraction bot.
Your goal is to extract the API pricing (per 1M tokens) for ALL models mentioned in the text below for the provider "${providerName}".
If the price is given per 1k tokens, multiply by 1000 to get per 1M. If given per token, multiply by 1,000,000.

Return ONLY a valid JSON array in this exact format, with NO markdown, NO \`\`\`json blocks, and NO extra text outside the array:
[
  {
    "modelName": "model-name-1",
    "promptPrice": "$X.XX",
    "completionPrice": "$Y.YY"
  }
]

If you cannot find any pricing data, return an empty array: []

Text to analyze:
----------------
${text.substring(0, 25000)}
----------------`,
      },
    ];

    console.log(`[Scraper] Sending to LLM for extraction (${providerName})...`);
    const openai = getOpenAIClient();
    const parsed = await callLLMWithFallback(openai, messages);

    return { data: parsed };
  } catch (error) {
    console.error(`[Scraper] Failed for provider "${providerName}":`, error.message);
    return { error: 'Extraction failed: ' + error.message };
  }
}
