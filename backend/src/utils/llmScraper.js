import { chromium } from 'playwright';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// All available models from the LLM provider, in priority order (best → fallback).
// If one model fails, the system automatically tries the next one.
const FREE_MODELS = [
  ...(process.env.LLM_DEFAULT_MODEL ? [process.env.LLM_DEFAULT_MODEL] : []),
  'Atria-Dawn-Preview',
  'zai-org/GLM-5.3-Flash',
  'deepseek-ai/DeepSeek-V4-Flash-0731',
  'MiniMaxAI/MiniMax-M2.7',
  'gpt-4o',
  'gpt-4o-mini',
  'mistralai/mistral-large',
  'qwen/qwen3.5-397b-a17b',
  'deepseek-ai/deepseek-v4-flash',
  'meta/llama-3.3-70b-instruct',
  'z-ai/glm-5.2',
  'minimaxai/minimax-m2.7',
];

// Lazy init: OpenAI client is only created when actually needed (not at module load time).
// This prevents a crash on server startup if LLM_API_KEY is not yet configured.
function getOpenAIClient() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY is not set in backend .env file. Please add it to use the AI scraper.');
  }
  return new OpenAI({
    baseURL: process.env.LLM_BASE_URL || 'https://inference.dahl.global/v1',
    apiKey,
  });
}

/**
 * Scrapes a URL using headless chromium to bypass basic bot protection
 * and wait for JS to render. Uses network-idle strategy for SPAs.
 */
async function scrapeText(url) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    // 1. Navigate and wait for domcontentloaded first (fast)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });

    // 2. Then wait for the network to go idle (catches SPA route renders)
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (_) {
      // networkidle timed out — page may still have useful content, continue
      console.warn(`[Scraper] networkidle timed out for ${url} — continuing anyway`);
    }

    // 3. Extra settle time for JS frameworks to paint pricing tables
    await new Promise(r => setTimeout(r, 5000));

    // 4. Extract all visible text (innerText respects CSS visibility)
    const text = await page.evaluate(() => {
      // Remove script/style/noscript tags before extracting
      document.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove());
      return document.body.innerText;
    });

    await browser.close();
    return text;
  } catch (error) {
    console.error(`[Scraper] Error scraping ${url}:`, error.message);
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}


/**
 * Tries to call the LLM with automatic fallback across all available free models.
 * If a model fails (API error OR invalid/non-JSON response), it automatically moves to the next one.
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

      // Try to parse JSON — if it fails, treat this model as failed and try the next
      const parsed = JSON.parse(content);

      // Must be an array
      if (!Array.isArray(parsed)) {
        throw new Error(`Expected JSON array but got ${typeof parsed}`);
      }

      console.log(`[Scraper] Model ${model} succeeded. Extracted ${parsed.length} models.`);
      return parsed;
    } catch (err) {
      console.warn(`[Scraper] Model ${model} failed: ${err.message}. Trying next model...`);
      lastError = err;
    }
  }

  // All models exhausted
  throw new Error(`All ${FREE_MODELS.length} models failed. Last error: ${lastError?.message}`);
}

/**
 * Extracts all models and their prompt/completion pricing from the scraped text.
 */
export async function extractPricingFromUrl(providerName, url) {
  try {
    console.log(`[Scraper] Scraping URL for provider ${providerName}: ${url}`);
    const text = await scrapeText(url);
    if (!text) {
      return { error: 'Failed to scrape page' };
    }

    const messages = [
      {
        role: 'user',
        content: `You are a strict data extraction bot.
Your goal is to extract the API pricing (per 1M tokens) for ALL models mentioned in the text below for the provider "${providerName}".
If the price is given per 1k tokens, multiply it by 1000 to get the price per 1M tokens.

Return ONLY a valid JSON array in this exact format, with NO markdown formatting, NO \`\`\`json blocks, and NO extra text:
[
  {
    "modelName": "model-name-1",
    "promptPrice": "$X.XX",
    "completionPrice": "$Y.YY"
  },
  {
    "modelName": "model-name-2",
    "promptPrice": "$X.XX",
    "completionPrice": "$Y.YY"
  }
]

If you cannot find any pricing, return an empty array [].

Text to analyze:
----------------
${text.substring(0, 20000)}
----------------`,
      },
    ];

    console.log(`[Scraper] Extracting pricing using LLM for ${providerName}...`);
    const openai = getOpenAIClient();
    const parsed = await callLLMWithFallback(openai, messages);

    return { data: parsed };
  } catch (error) {
    console.error(`[Scraper] LLM Error for ${providerName}:`, error.message);
    return { error: 'LLM extraction failed: ' + error.message };
  }
}
