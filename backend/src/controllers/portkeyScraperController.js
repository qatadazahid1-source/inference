import { ApifyClient } from 'apify-client';

// node-fetch nahi chahiye — Node.js 18+ mein fetch natively built-in hai

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ATRIA_API_KEY = process.env.ATRIA_API_KEY;
const ATRIA_BASE_URL = 'https://api.atria-asi.ai/v1';
const ATRIA_MODEL = 'Atria-Dawn-Preview';

export const fetchPortkeyPricing = async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider name is required.' });
    }

    console.log(`[Portkey Fetch] Starting fetch for provider: ${provider}`);
    
    // We target the specific provider's page on portkey, or the main models page if "all"
    const targetUrl = provider.toLowerCase() === 'all' 
      ? 'https://portkey.ai/models'
      : `https://portkey.ai/models/${provider.toLowerCase().replace(/\s+/g, '-')}`;

    // 1. Scrape with Apify (using website-content-crawler which returns text/markdown)
    console.log(`[Portkey Fetch] Using Apify to scrape: ${targetUrl}`);
    const client = new ApifyClient({ token: APIFY_TOKEN });
    
    // We use a lightweight scraper to just get the markdown/text of the page
    const run = await client.actor("apify/website-content-crawler").call({
        startUrls: [{ url: targetUrl }],
        maxCrawlPages: 1,
        crawlerType: "playwright:adaptive",
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0 || !items[0].markdown) {
      throw new Error("Failed to extract content via Apify.");
    }

    const scrapedText = items[0].markdown;
    console.log(`[Portkey Fetch] Apify returned ${scrapedText.length} characters of markdown.`);

    // 2. Parse with Atria LLM
    console.log(`[Portkey Fetch] Sending to Atria LLM (${ATRIA_MODEL}) for parsing...`);
    
    const extractionPrompt = `You are a strict data extraction bot.
Extract ALL models listed in the pricing table for the provider "${provider}". Each row usually has a Provider, Model ID, Input price, and Output price.
Prices are in dollars per 1M tokens. If given per 1k tokens, multiply by 1000.

Return ONLY a valid JSON array — NO markdown, NO \`\`\`json, NO extra text:
[
  {
    "providerName": "${provider}",
    "modelName": "model-name",
    "endpoint": "chat",
    "promptPrice": "$X.XX",
    "completionPrice": "$Y.YY"
  }
]

IMPORTANT: Include ALL rows you can find in the text. If a price shows "Free" use "$0.00".
If no pricing data found at all, return: []

Text to analyze (first 30000 chars):
----------------
${scrapedText.substring(0, 30000)}
----------------`;

    const atriaResponse = await fetch(`${ATRIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ATRIA_API_KEY}`
      },
      body: JSON.stringify({
        model: ATRIA_MODEL,
        messages: [{ role: 'user', content: extractionPrompt }],
        temperature: 0,
      })
    });

    if (!atriaResponse.ok) {
      const errBody = await atriaResponse.text();
      throw new Error(`Atria API error: ${atriaResponse.status} ${errBody}`);
    }

    const atriaData = await atriaResponse.json();
    let content = atriaData.choices[0].message.content.trim();

    // Clean up markdown block if the LLM adds it
    if (content.startsWith('```json')) {
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/```/g, '').trim();
    }

    // Find JSON array bounds
    const arrayStart = content.indexOf('[');
    const arrayEnd = content.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1) {
      content = content.substring(arrayStart, arrayEnd + 1);
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected JSON array but got ${typeof parsed}`);
    }

    console.log(`[Portkey Fetch] Atria successfully parsed ${parsed.length} models.`);
    
    res.json({ success: true, models: parsed });

  } catch (error) {
    console.error(`[Portkey Fetch] Error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
};
