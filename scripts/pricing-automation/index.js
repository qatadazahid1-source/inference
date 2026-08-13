import { google } from 'googleapis';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ─────────────────────────────────────────────────────────
// CONFIGURATION: Which providers to include
// OpenRouter model IDs start with these prefixes:
// ─────────────────────────────────────────────────────────
const PROVIDER_PREFIXES = {
  'OpenAI':     'openai/',
  'Anthropic':  'anthropic/',
  'Cohere':     'cohere/',
  'Google':     'google/',
  'Groq (xAI)': 'x-ai/',
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';
const OPENROUTER_MODELS_PAGE = 'https://openrouter.ai/models';

// ─────────────────────────────────────────────────────────
// Telegram
// ─────────────────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  }, { timeout: 30000 });
}

// ─────────────────────────────────────────────────────────
// Google Sheets
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Helper: convert per-token price to per-1M-tokens
// ─────────────────────────────────────────────────────────
function toPerMillion(priceStr) {
  if (!priceStr || priceStr === '0') return '$0.00';
  const perToken = parseFloat(priceStr);
  const perMillion = perToken * 1_000_000;
  return `$${perMillion.toFixed(4)}`;
}

// ─────────────────────────────────────────────────────────
// Helper: skip free / batch / :nitro / :extended variants
// ─────────────────────────────────────────────────────────
function isVariant(modelId) {
  return modelId.includes(':free') ||
         modelId.includes(':batch') ||
         modelId.includes(':nitro') ||
         modelId.includes(':extended') ||
         modelId.startsWith('~');
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function run() {
  console.log('Starting AI Pricing Automation via OpenRouter API...');
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch all models from OpenRouter
  console.log('Fetching models from OpenRouter...');
  let allModels;
  try {
    const response = await axios.get(OPENROUTER_API_URL, { timeout: 30000 });
    allModels = response.data.data;
    console.log(`Total models fetched: ${allModels.length}`);
  } catch (err) {
    console.error('Failed to fetch from OpenRouter:', err.message);
    await sendTelegramMessage(`❌ *Pricing Automation FAILED*\nCould not fetch data from OpenRouter.\nError: ${err.message}`);
    return;
  }

  // 2. Filter by providers and remove variants
  const filteredByProvider = {};
  for (const [providerName, prefix] of Object.entries(PROVIDER_PREFIXES)) {
    filteredByProvider[providerName] = allModels.filter(
      m => m.id.startsWith(prefix) && !isVariant(m.id)
    );
  }

  // 3. Read previous data from Google Sheets to detect changes
  const sheets = await getSheetsClient();
  let previousData = new Map(); // key: modelId -> { inputPrice, outputPrice }
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:G',
    });
    const rows = res.data.values || [];
    rows.forEach(row => {
      if (row[1]) { // column B = model id
        previousData.set(row[1], { inputPrice: row[3], outputPrice: row[4] });
      }
    });
    console.log(`Loaded ${previousData.size} previous records from Sheet.`);
  } catch (err) {
    console.warn('Could not read previous sheet data (may be first run):', err.message);
  }

  // 4. Build sheet rows + telegram message
  const sheetRows = [
    ['Provider', 'Model ID', 'Model Name', 'Input (per 1M tokens)', 'Output (per 1M tokens)', 'Status', 'Last Updated', 'Source URL']
  ];

  let telegramMsg = `🔔 *Daily AI Model Pricing Update*\n📅 Date: ${today}\n📊 Source: OpenRouter\n\n`;
  let changedCount = 0;
  let newCount = 0;
  let totalCount = 0;

  for (const [providerName, models] of Object.entries(filteredByProvider)) {
    if (models.length === 0) {
      console.log(`No models found for provider: ${providerName}`);
      continue;
    }

    telegramMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
    telegramMsg += `🏢 *${providerName}* (${models.length} models)\n`;
    telegramMsg += `━━━━━━━━━━━━━━━━━━━━\n`;

    for (const model of models) {
      const inputPrice  = toPerMillion(model.pricing?.prompt);
      const outputPrice = toPerMillion(model.pricing?.completion);
      const modelUrl    = `${OPENROUTER_MODELS_PAGE}/${model.id}`;

      // Detect change
      const prev = previousData.get(model.id);
      let status = '🟢 No Change';
      if (!prev) {
        status = '🔵 New Model';
        newCount++;
      } else if (prev.inputPrice !== inputPrice || prev.outputPrice !== outputPrice) {
        status = `🔴 Changed (was In: ${prev.inputPrice} | Out: ${prev.outputPrice})`;
        changedCount++;
      }

      totalCount++;
      sheetRows.push([providerName, model.id, model.name, inputPrice, outputPrice, status, today, modelUrl]);

      telegramMsg += `*${model.name}*\n`;
      telegramMsg += `  • Input:  ${inputPrice} / 1M\n`;
      telegramMsg += `  • Output: ${outputPrice} / 1M\n`;
      telegramMsg += `  • Status: ${status}\n\n`;
    }
  }

  // 5. Summary
  const summaryLine = `📈 *Summary:* ${totalCount} models | 🔴 ${changedCount} changed | 🔵 ${newCount} new`;
  telegramMsg += `\n${summaryLine}\n`;
  telegramMsg += `\n👉 [View Full Sheet](https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID})\n`;
  telegramMsg += `🔗 [OpenRouter Models](${OPENROUTER_MODELS_PAGE})\n`;
  telegramMsg += `\n_Please verify and update the admin panel pricing._`;

  // 6. Update Google Sheets
  console.log(`Writing ${sheetRows.length - 1} rows to Google Sheets...`);
  try {
    // Clear existing data first
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1',
    });
    // Write new data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: sheetRows },
    });
    console.log('Google Sheets updated successfully.');
  } catch (err) {
    console.error('Failed to update Google Sheets:', err.message);
    telegramMsg += `\n⚠️ *Warning:* Could not update Google Sheet.\nError: ${err.message}`;
  }

  // 7. Send Telegram message
  // Telegram has a 4096 char limit per message - split if needed
  console.log('Sending Telegram message...');
  const MAX_LEN = 4000;
  if (telegramMsg.length <= MAX_LEN) {
    try {
      await sendTelegramMessage(telegramMsg);
      console.log('Telegram message sent successfully.');
    } catch (err) {
      console.error('Failed to send Telegram message:', err.message);
    }
  } else {
    // Split into chunks
    const chunks = [];
    let current = '';
    for (const line of telegramMsg.split('\n')) {
      if ((current + '\n' + line).length > MAX_LEN) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    if (current) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
      try {
        await sendTelegramMessage(`*Part ${i + 1}/${chunks.length}*\n\n${chunks[i]}`);
        console.log(`Sent Telegram part ${i + 1}/${chunks.length}`);
        // Small delay between messages
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Failed to send Telegram part ${i + 1}:`, err.message);
      }
    }
  }

  console.log('✅ Automation completed successfully!');
  console.log(`Summary: ${totalCount} models processed | ${changedCount} changed | ${newCount} new`);
}

run().catch(async (err) => {
  console.error('Fatal error:', err);
  try {
    await sendTelegramMessage(`❌ *Pricing Automation CRASHED*\nError: ${err.message}`);
  } catch {}
  process.exit(1);
});
