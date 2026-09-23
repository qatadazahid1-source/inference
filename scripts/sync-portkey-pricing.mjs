#!/usr/bin/env node
/**
 * Portkey Pricing Sync
 *
 * Usage:
 *   npm run sync:pricing
 *
 * Optional:
 *   node scripts/sync-portkey-pricing.mjs --out data/portkey-pricing.json
 *
 * No API key is required.
 * Source:
 *   https://github.com/Portkey-AI/models
 *
 * Portkey stores prices as CENTS PER TOKEN.
 * This script adds normalized USD PER 1M TOKENS fields:
 *   cents/token * 10000 = USD/1M tokens
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_OWNER = "Portkey-AI";
const REPO_NAME = "models";
const BRANCH = "main";

const TREE_URL =
  `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`;

const RAW_BASE =
  `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/`;

function parseArgs() {
  const args = process.argv.slice(2);
  let out = "data/portkey-pricing.json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out" && args[i + 1]) {
      out = args[++i];
    }
  }

  return { out };
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "ordisum-portkey-pricing-sync",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}: ${url}\n${body.slice(0, 500)}`);
  }

  return response.json();
}

function centsPerTokenToUsdPerMillion(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Number((value * 10000).toFixed(10));
}

function normalizePriceObject(priceObject) {
  if (!priceObject || typeof priceObject !== "object") return null;

  const result = { raw: priceObject };

  if (typeof priceObject.price === "number") {
    result.cents_per_token = priceObject.price;
    result.usd_per_1m_tokens = centsPerTokenToUsdPerMillion(priceObject.price);
  }

  // Some pricing entries can contain dimensions/tiers in addition to `price`.
  for (const [key, value] of Object.entries(priceObject)) {
    if (key !== "price" && !(key in result)) {
      result[key] = value;
    }
  }

  return result;
}

function normalizePricingConfig(pricingConfig) {
  if (!pricingConfig || typeof pricingConfig !== "object") return null;

  const out = {};

  for (const [tierName, tierValue] of Object.entries(pricingConfig)) {
    if (!tierValue || typeof tierValue !== "object") {
      out[tierName] = tierValue;
      continue;
    }

    const tier = {};

    for (const [unit, unitValue] of Object.entries(tierValue)) {
      if (
        unitValue &&
        typeof unitValue === "object" &&
        typeof unitValue.price === "number"
      ) {
        tier[unit] = normalizePriceObject(unitValue);
      } else if (unit === "additional_units" && unitValue && typeof unitValue === "object") {
        tier.additional_units = {};
        for (const [additionalUnit, additionalValue] of Object.entries(unitValue)) {
          tier.additional_units[additionalUnit] =
            normalizePriceObject(additionalValue);
        }
      } else {
        tier[unit] = unitValue;
      }
    }

    out[tierName] = tier;
  }

  return out;
}

function getPayg(config) {
  return config?.pricing_config?.pay_as_you_go ?? null;
}

function pickUsd(payg, key) {
  const value = payg?.[key]?.price;
  return typeof value === "number" ? centsPerTokenToUsdPerMillion(value) : null;
}

function normalizeModel(provider, modelId, modelConfig) {
  const payg = getPayg(modelConfig);

  return {
    provider,
    model: modelId,

    // Convenient fields for Ordisum
    input_usd_per_1m: pickUsd(payg, "request_token"),
    output_usd_per_1m: pickUsd(payg, "response_token"),
    cache_read_usd_per_1m: pickUsd(payg, "cache_read_input_token"),
    cache_write_usd_per_1m: pickUsd(payg, "cache_write_input_token"),
    audio_input_usd_per_1m: pickUsd(payg, "request_audio_token"),
    audio_output_usd_per_1m: pickUsd(payg, "response_audio_token"),

    currency: modelConfig?.pricing_config?.currency ?? null,

    pricing_config: normalizePricingConfig(modelConfig?.pricing_config),
  };
}

async function main() {
  const { out } = parseArgs();

  console.log("\n==========================================");
  console.log("       ORDISUM • PORTKEY PRICING SYNC");
  console.log("==========================================\n");

  console.log("1/4 Reading Portkey pricing file list...");

  const tree = await getJson(TREE_URL);

  if (!Array.isArray(tree.tree)) {
    throw new Error("Unexpected GitHub tree response.");
  }

  const pricingFiles = tree.tree
    .filter(
      (item) =>
        item.type === "blob" &&
        /^pricing\/.+\.json$/i.test(item.path)
    )
    .map((item) => item.path)
    .sort();

  if (!pricingFiles.length) {
    throw new Error("No pricing/*.json files were found in the Portkey repository.");
  }

  console.log(`   Found ${pricingFiles.length} provider pricing files.`);

  const providers = {};
  const models = [];
  let failed = 0;

  console.log("2/4 Downloading provider pricing...");

  for (let i = 0; i < pricingFiles.length; i++) {
    const filePath = pricingFiles[i];
    const provider = path.basename(filePath, ".json");
    const url = RAW_BASE + filePath;

    process.stdout.write(
      `   [${String(i + 1).padStart(3, " ")}/${pricingFiles.length}] ${provider} ... `
    );

    try {
      const payload = await getJson(url);
      providers[provider] = payload;

      for (const [modelId, modelConfig] of Object.entries(payload ?? {})) {
        models.push(normalizeModel(provider, modelId, modelConfig));
      }

      console.log("OK");
    } catch (error) {
      failed++;
      console.log("FAILED");
      console.error(`       ${error.message}`);
    }
  }

  console.log("3/4 Building normalized Ordisum dataset...");

  models.sort((a, b) =>
    `${a.provider}/${a.model}`.localeCompare(`${b.provider}/${b.model}`)
  );

  const output = {
    source: {
      name: "Portkey Models",
      repository: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
      pricing_api: "https://configs.portkey.ai/pricing/{provider}.json",
      model_api: "https://api.portkey.ai/model-configs/pricing/{provider}/{model}",
      branch: BRANCH,
    },

    generated_at: new Date().toISOString(),

    units: {
      source_price_unit: "cents_per_token",
      normalized_price_unit: "usd_per_1m_tokens",
      conversion: "cents_per_token * 10000",
    },

    summary: {
      provider_files: pricingFiles.length,
      successful_provider_files: pricingFiles.length - failed,
      failed_provider_files: failed,
      models: models.length,
    },

    // Full provider JSON exactly as downloaded from Portkey.
    providers,

    // Flat, Ordisum-friendly representation.
    models,
  };

  const outputPath = path.resolve(process.cwd(), out);
  await mkdir(path.dirname(outputPath), { recursive: true });

  console.log("4/4 Writing output...");
  await writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log("\n==========================================");
  console.log("SYNC COMPLETE");
  console.log("==========================================");
  console.log(`Providers : ${output.summary.successful_provider_files}/${output.summary.provider_files}`);
  console.log(`Models    : ${output.summary.models}`);
  console.log(`Failed    : ${output.summary.failed_provider_files}`);
  console.log(`Output    : ${path.relative(process.cwd(), outputPath)}`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("\nSYNC FAILED\n");
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
