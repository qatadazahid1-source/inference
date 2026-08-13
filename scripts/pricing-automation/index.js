import { chromium } from 'playwright';
import OpenAI from 'openai';
import { google } from 'googleapis';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const MODELS = [
  {
    name: 'GPT-4o',
    url: 'https://openai.com/api/pricing/',
  },
  {
    name: 'Claude 3.5 Sonnet',
    url: 'https://www.anthropic.com/pricing',
  },
  // Add more models as needed
];

// Initialize OpenAI client
const openai = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || 'https://api.bluesminds.com/v1',
  apiKey: process.env.LLM_API_KEY,
});

// Initialize Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Google Sheets Setup
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
async function getSheetsClient() {
  const credentialsJson = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentialsJson.client_email,
      private_key: credentialsJson.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// 1. Scrape text from URL using Playwright
async function scrapeText(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait a little bit for dynamic content
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return text;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    await browser.close();
    return null;
  }
}

// 2. Extract pricing using LLM
async function extractPricingFromText(modelName, text) {
  if (!text) return { error: 'Failed to scrape page' };

  const prompt = `You are a strict data extraction bot.
Extract the API pricing (per 1M tokens) for the model "${modelName}" from the text below.
If the price is per 1k tokens, multiply it by 1000 to get the price per 1M tokens.

Return ONLY a valid JSON object in this exact format:
{
  "promptPrice": "$X.XX",
  "completionPrice": "$Y.YY"
}
If you cannot find the exact pricing, return:
{
  "error": "Pricing not found"
}

Do not include markdown blocks like \`\`\`json. Just the JSON object.

Text to analyze:
----------------
${text.substring(0, 15000)}
----------------`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Assuming the endpoint uses a mapping or default model
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    let content = response.choices[0].message.content.trim();
    // Clean up potential markdown formatting
    if (content.startsWith('```json')) {
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (content.startsWith('```')) {
        content = content.replace(/```/g, '').trim();
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error(`LLM Error for ${modelName}:`, error.message);
    return { error: 'LLM extraction failed' };
  }
}

// 3. Main process
async function run() {
  console.log('Starting AI Model Pricing Automation...');
  
  const results = [];
  const sheets = await getSheetsClient();

  // Read existing sheet data to compare
  let existingData = [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:E', // Assuming A: Name, B: Prompt, C: Completion, D: Date, E: Source
    });
    existingData = res.data.values || [];
  } catch (error) {
    console.error('Error reading Google Sheets. It might be empty or unformatted.', error.message);
  }

  const existingMap = new Map();
  existingData.forEach(row => {
    if (row[0]) existingMap.set(row[0], { prompt: row[1], completion: row[2] });
  });

  const sheetUpdates = [];
  sheetUpdates.push(['Model Name', 'Prompt Price (1M)', 'Completion Price (1M)', 'Status', 'Last Updated', 'Source URL']); // Header

  let telegramMessage = `🔔 *Daily AI Model Pricing Update* 🔔\n\nPlease check and verify:\n\n`;

  for (const model of MODELS) {
    console.log(`Processing: ${model.name}`);
    
    console.log(`- Scraping ${model.url}...`);
    const text = await scrapeText(model.url);
    
    console.log(`- Extracting pricing via LLM...`);
    const pricing = await extractPricingFromText(model.name, text);
    
    let status = '🟢 No Change';
    let promptPrice = pricing.promptPrice || 'N/A';
    let completionPrice = pricing.completionPrice || 'N/A';

    if (pricing.error) {
      status = `⚠️ FLAGGED (${pricing.error})`;
    } else {
      const old = existingMap.get(model.name);
      if (old && (old.prompt !== promptPrice || old.completion !== completionPrice)) {
        status = `🔴 PRICE CHANGED (Was: Prompt ${old.prompt}, Comp ${old.completion})`;
      } else if (!old) {
        status = `🔵 NEW MODEL ADDED`;
      }
    }

    results.push({
      name: model.name,
      prompt: promptPrice,
      completion: completionPrice,
      status: status,
      url: model.url
    });

    const date = new Date().toISOString().split('T')[0];
    sheetUpdates.push([model.name, promptPrice, completionPrice, status, date, model.url]);

    telegramMessage += `*${model.name}*\n`;
    telegramMessage += `- Prompt: ${promptPrice}\n`;
    telegramMessage += `- Completion: ${completionPrice}\n`;
    telegramMessage += `- Status: ${status}\n`;
    telegramMessage += `- Source: ${model.url}\n\n`;
  }

  // Update Google Sheet
  console.log('Updating Google Sheets...');
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: sheetUpdates },
    });
    console.log('Google Sheets updated successfully.');
  } catch (error) {
    console.error('Failed to update Google Sheets:', error.message);
  }

  // Send Telegram Message
  console.log('Sending Telegram message...');
  try {
    telegramMessage += `\n👉 Check Sheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;
    await bot.sendMessage(TELEGRAM_CHAT_ID, telegramMessage, { parse_mode: 'Markdown', disable_web_page_preview: true });
    console.log('Telegram message sent successfully.');
  } catch (error) {
    console.error('Failed to send Telegram message:', error.message);
  }

  console.log('Automation completed successfully.');
}

run().catch(console.error);
