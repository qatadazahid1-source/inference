/**
 * backend/seed-seo.js
 *
 * Seeds CMS content for the Ordisum SEO implementation.
 * Content sourced from ORDISUM_SEO_CONTENT_PRODUCTION_FINAL.md.
 *
 * Run from the workspace root:
 *   node backend/seed-seo.js
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 * All [VERIFY BEFORE PUBLISHING] flags are preserved as placeholder copy —
 * no fabricated claims are inserted.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ────────────────────────────────────────────────────────────────
// STATIC PAGES
// ────────────────────────────────────────────────────────────────
const staticPages = [
  // ── /features ──────────────────────────────────────────────────
  {
    slug: 'features',
    title: 'Features',
    meta_title: 'Features | Ordisum — AI Cost Tracking, Budget Enforcement & ROI',
    meta_description: 'See every feature that helps engineering and finance teams track, enforce, and prove the ROI of AI API spend.',
    meta_keywords: 'LLM cost tracking platform, AI cost monitoring, AI budget enforcement, AI ROI calculator',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'Everything you need to see, control, and prove the value of your AI spend',
        subheadline: 'Ordisum gives engineering and finance teams one place to track costs, enforce hard budgets, and report ROI — across every AI provider.',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'Talk to Sales', href: '/contact-sales' },
      },
      sections: [
        {
          heading: 'Unified Cost Dashboard',
          subheading: 'Multi-Provider Tracking',
          items: [
            { title: 'Real-time visibility', description: 'One dashboard, broken down by model, provider, team, and project. Refreshes every 5 minutes.' },
            { title: 'No more console-hopping', description: 'Stop manually reconciling five different billing pages to answer "what did we spend this week."' },
            { title: 'Multi-provider', description: 'Tracks OpenAI, Anthropic, Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere from a single view.' },
          ],
        },
        {
          heading: 'Hard Budget Enforcement',
          subheading: 'Not Just Alerts',
          items: [
            { title: 'Block before overspend', description: 'Set a monthly or quarterly hard limit. Ordisum blocks requests before they push you past it — this is auto-throttling, not notification.' },
            { title: 'Per team / per project', description: 'Budgets are configurable at the team and project level, not just account-wide.' },
            { title: 'Engineering ships faster', description: 'Engineers can move fast without finance worrying about a surprise bill.' },
          ],
        },
        {
          heading: 'Smart Alerts & Anomaly Detection',
          subheading: null,
          items: [
            { title: 'Threshold alerts', description: '50/75/90/100% alerts via Email, Slack, or SMS — you choose the channel.' },
            { title: 'Anomaly detection', description: 'Fires automatically when hourly spend exceeds 3× your 7-day rolling average.' },
            { title: 'Hour-level response', description: 'You find out within the hour, not at month-end.' },
          ],
        },
        {
          heading: 'ROI Calculator',
          subheading: null,
          items: [
            { title: 'Defensible business case', description: 'Combines real spend data with team size, hourly rate, and productivity benchmarks to produce a ROI figure you can bring to a budget review.' },
            { title: 'No spreadsheet needed', description: 'All inputs are already tracked — the calculator turns them into a report automatically.' },
          ],
        },
        {
          heading: 'External API Gateway',
          subheading: null,
          items: [
            { title: 'Platform keys (ii_sk_...)', description: 'Issue read-only platform keys so any external app or script routes through Ordisum and appears in the same dashboard.' },
            { title: 'No blind spots', description: 'Cost tracking no longer stops at your main app — third-party tools and internal scripts are visible too.' },
          ],
        },
        {
          heading: 'Zero-Code Integration',
          subheading: null,
          items: [
            { title: 'Base-URL swap only', description: 'Point your existing HTTP client at the Ordisum Gateway base URL and use your Ordisum API key. No SDK install, no code change beyond configuration.' },
          ],
        },
      ],
      faqs: [
        { question: 'How often does the dashboard update?', answer: 'Every 5 minutes.' },
        { question: 'Does budget enforcement actually block requests, or just alert?', answer: 'It blocks requests before the limit is exceeded.' },
        { question: 'Which providers do you support?', answer: 'OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere.' },
        { question: 'Do I need to install an SDK?', answer: 'No — change your base URL to the Ordisum Gateway and use an Ordisum API key.' },
        { question: 'Can I track usage from scripts outside my main app?', answer: 'Yes, via the External API Gateway\'s platform keys (ii_sk_...).' },
      ],
      finalCta: {
        headline: 'Ready to see where your AI budget is actually going?',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'Talk to Sales', href: '/contact-sales' },
      },
    },
  },

  // ── /pricing ───────────────────────────────────────────────────
  {
    slug: 'pricing',
    title: 'Pricing',
    meta_title: 'Pricing | Ordisum',
    meta_description: 'Plans for teams of every size — track, budget, and enforce AI API spend from day one.',
    meta_keywords: 'AI cost monitoring pricing, LLM tracking plans',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'Simple pricing, built to pay for itself',
        subheadline: 'Every plan includes real-time cost tracking, budget enforcement, and the ROI calculator — pick the plan that matches your team\'s usage.',
      },
      faqs: [
        { question: 'Is there a free trial?', answer: 'See the plan cards above for current trial details.' },
        { question: 'Can I upgrade or downgrade anytime?', answer: 'Yes — plan changes take effect immediately.' },
        { question: 'Do you offer enterprise or custom plans?', answer: 'Yes — contact us for volume pricing and SLA options.' },
      ],
      finalCta: {
        headline: 'Questions about pricing?',
        primaryCta: { label: 'Talk to Sales', href: '/contact-sales' },
        secondaryCta: { label: 'View Features', href: '/features' },
      },
    },
  },

  // ── /security ──────────────────────────────────────────────────
  {
    slug: 'security',
    title: 'Security',
    meta_title: 'Enterprise Security | Ordisum AI Gateway',
    meta_description: 'Ordisum secures your AI API keys with AES-256-GCM encryption and requires strictly read-only access. We never store your prompts.',
    meta_keywords: 'AI API security, LLM data privacy, AI key encryption',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'Security built around one rule: we never see more than we need to',
        subheadline: 'Ordisum sits between your application and your AI providers — which means the way we handle your keys and your data matters as much as the cost tracking itself.',
      },
      sections: [
        {
          heading: 'API Key Protection',
          items: [
            { title: 'AES-256-GCM at rest', description: 'Your provider API keys are encrypted at rest with AES-256-GCM. The plaintext key is never written to logs.' },
            { title: 'Read-only access', description: 'Wherever your provider supports key-level scoping, Ordisum requires a read-only key — we don\'t need write access to meter your usage.' },
          ],
        },
        {
          heading: 'Prompt-Storage Policy',
          items: [
            { title: 'No prompt storage', description: 'Ordisum tracks cost and usage metadata only: token counts, model, provider, timestamp, and team/project attribution. Prompt and completion content is never stored.' },
          ],
        },
        {
          heading: 'Account Security',
          items: [
            { title: 'Two-factor authentication', description: 'TOTP-based 2FA is supported on your account.' },
          ],
        },
      ],
      faqs: [
        { question: 'Do you store my prompts?', answer: 'No — only cost and usage metadata (token counts, model, provider, timestamp, team/project attribution).' },
        { question: 'Are my API keys safe?', answer: 'Yes — encrypted with AES-256-GCM at rest, and we require read-only keys where supported by the provider.' },
        { question: 'Is 2FA available?', answer: 'Yes — TOTP-based two-factor authentication is supported.' },
        { question: 'Are you GDPR compliant?', answer: 'We implement data-minimisation principles: only cost metadata is stored, never prompt content. For full compliance details, contact us.' },
      ],
      finalCta: {
        headline: 'Questions about our security model?',
        primaryCta: { label: 'Talk to Sales', href: '/contact-sales' },
        secondaryCta: { label: 'Read the Docs', href: '/docs/api-auth' },
      },
    },
  },

  // ── /alternatives/helicone ─────────────────────────────────────
  {
    slug: 'alternatives-helicone',
    title: 'Ordisum vs. Helicone',
    meta_title: 'Ordisum vs. Helicone: An AI Cost Control Alternative',
    meta_description: 'Comparing Ordisum and Helicone for AI API cost management — budget enforcement, ROI reporting, and zero-SDK setup.',
    meta_keywords: 'Helicone alternative, AI cost monitoring, LLM budget enforcement',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'Ordisum vs. Helicone: The Alternative Built for Budget Control',
        subheadline: 'If your primary need is passive cost visibility, Helicone is a capable, established option. If you need to stop overspend before it happens and report AI ROI to finance, that\'s what Ordisum is built for.',
      },
      intro: {
        heading: 'Two different jobs',
        body: 'Helicone is a widely used AI gateway focused on observability — logging, caching, and cost/latency visibility via a proxy integration. Ordisum focuses on hard budget enforcement and ROI measurement. Understanding the difference helps you pick the right tool.',
      },
      comparisonTable: {
        heading: 'Side-by-side comparison',
        columns: ['', 'Helicone', 'Ordisum'],
        rows: [
          { label: 'Core focus', values: ['Observability/logging', 'Budget enforcement + ROI'] },
          { label: 'Budget enforcement', values: ['Alert-based', 'Hard limits — requests blocked before overspend'] },
          { label: 'ROI reporting', values: ['Not built in', 'Built-in ROI Calculator'] },
          { label: 'Integration', values: ['Proxy-based', 'Base-URL swap, zero SDK'] },
        ],
      },
      sections: [
        {
          heading: 'Hard Budget Enforcement (Not Just Alerts)',
          items: [
            { title: null, description: 'Ordisum blocks requests before a budget is exceeded — not after. An alert that fires post-overspend documents the problem; it doesn\'t prevent it.' },
          ],
        },
        {
          heading: 'Built-in ROI Calculation',
          items: [
            { title: null, description: 'The ROI Calculator turns tracked spend into a business case automatically, using team size, hourly rate, and productivity benchmarks.' },
          ],
        },
        {
          heading: 'Finance-Ready Reporting',
          items: [
            { title: null, description: 'Attribution by team and project, exportable for the conversation with finance — not just engineering debugging.' },
          ],
        },
      ],
      faqs: [
        { question: 'Does Ordisum store prompts like Helicone might?', answer: 'No — Ordisum never stores prompts, only cost and usage metadata (token counts, model, provider, timestamp, team/project attribution).' },
        { question: 'Do I need to install an SDK to use Ordisum?', answer: 'No — Ordisum integrates via a base-URL swap and an Ordisum API key, no SDK required.' },
      ],
      finalCta: {
        headline: 'Ready to enforce your AI budget?',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'See all Features', href: '/features' },
      },
      relatedLinks: {
        heading: 'Explore more',
        links: [
          { label: 'See the full feature set', href: '/features', description: null },
          { label: 'AI Budget Management use case', href: '/use-cases/ai-budget-management', description: null },
          { label: 'Security model', href: '/security', description: null },
        ],
      },
    },
  },

  // ── /alternatives/langfuse ─────────────────────────────────────
  {
    slug: 'alternatives-langfuse',
    title: 'Ordisum vs. Langfuse',
    meta_title: 'Ordisum vs. Langfuse: Financial Control vs. Output Evaluation',
    meta_description: 'Langfuse focuses on LLM tracing and evaluation. Ordisum focuses on budget enforcement and AI ROI. See which fits your team.',
    meta_keywords: 'Langfuse alternative, AI cost tracking, LLM budget enforcement',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'Ordisum vs. Langfuse: Financial Control vs. Output Evaluation',
        subheadline: 'Langfuse is built for teams debugging complex agent workflows. Ordisum is built for teams who need to enforce a budget and report AI ROI to finance.',
      },
      intro: {
        heading: 'Different tools for different jobs',
        body: 'Langfuse is an open-source, self-hostable platform built around detailed LLM tracing and evaluation — strong for debugging what a model actually did on a given request. Ordisum focuses on the cost enforcement and ROI measurement side of the equation.',
      },
      comparisonTable: {
        heading: 'Side-by-side comparison',
        columns: ['', 'Langfuse', 'Ordisum'],
        rows: [
          { label: 'Core focus', values: ['Tracing/evaluation', 'Budget enforcement + ROI'] },
          { label: 'Hosting', values: ['Self-hostable', 'Managed'] },
          { label: 'Integration', values: ['SDK-based', 'Base-URL swap, zero SDK'] },
          { label: 'ROI reporting', values: ['Not built in', 'Built-in ROI Calculator'] },
        ],
      },
      sections: [
        {
          heading: 'Budget Enforcement, Not Trace Debugging',
          items: [
            { title: null, description: 'If your pain is "finance is going to ask why the AI bill tripled," that\'s the enforcement job Ordisum is built for — not tracing individual spans.' },
          ],
        },
        {
          heading: 'Zero-SDK Setup',
          items: [
            { title: null, description: 'No instrumentation across every service. A base-URL swap and you\'re tracking spend in minutes.' },
          ],
        },
        {
          heading: 'ROI Calculator built for the finance conversation',
          items: [
            { title: null, description: 'Turns tracked spend into a business case using team size, hourly rate, and productivity benchmarks.' },
          ],
        },
      ],
      faqs: [
        { question: 'Can I self-host Ordisum like Langfuse?', answer: 'Ordisum is a managed platform. For self-hosting or enterprise deployment options, contact sales.' },
        { question: 'Do I need to install an SDK to use Ordisum?', answer: 'No — Ordisum integrates via a base-URL swap and an Ordisum API key, no SDK required.' },
      ],
      finalCta: {
        headline: 'Need budget enforcement, not trace debugging?',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'See all Features', href: '/features' },
      },
      relatedLinks: {
        heading: 'Explore more',
        links: [
          { label: 'See the full feature set', href: '/features', description: null },
          { label: 'AI Budget Management use case', href: '/use-cases/ai-budget-management', description: null },
          { label: 'Security model', href: '/security', description: null },
        ],
      },
    },
  },

  // ── /alternatives/portkey ──────────────────────────────────────
  {
    slug: 'alternatives-portkey',
    title: 'Ordisum vs. Portkey',
    meta_title: 'Ordisum vs. Portkey: Cost Enforcement vs. Multi-Provider Routing',
    meta_description: 'Portkey is a routing and gateway control panel. Ordisum is built specifically around budget enforcement and AI ROI reporting.',
    meta_keywords: 'Portkey alternative, AI budget management, LLM cost enforcement',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'Ordisum vs. Portkey: Cost Enforcement vs. Multi-Provider Routing',
        subheadline: 'Portkey is the right tool if multi-provider routing and fallback chains are your primary need. Ordisum is the right tool if budget enforcement and ROI reporting are.',
      },
      intro: {
        heading: 'Routing vs. enforcement',
        body: 'Portkey positions itself as a control panel for production AI — multi-provider routing, fallback chains, and guardrails, with observability as one part of a broader gateway. Ordisum is narrower and deeper: purpose-built for stopping overspend and reporting AI ROI.',
      },
      comparisonTable: {
        heading: 'Side-by-side comparison',
        columns: ['', 'Portkey', 'Ordisum'],
        rows: [
          { label: 'Core focus', values: ['Routing/guardrails', 'Budget enforcement + ROI'] },
          { label: 'Budget enforcement', values: ['Via configuration', 'Hard limits, built in'] },
          { label: 'ROI reporting', values: ['Not built in', 'Built-in ROI Calculator'] },
          { label: 'Integration', values: ['SDK or proxy', 'Base-URL swap, zero SDK'] },
        ],
      },
      sections: [
        {
          heading: 'Purpose-Built for Budget Enforcement',
          items: [
            { title: null, description: 'Ordisum\'s primary job is stopping overspend before it happens, with hard limits that block requests rather than alerting retroactively.' },
          ],
        },
        {
          heading: 'ROI Calculator with no equivalent in a routing-first product',
          items: [
            { title: null, description: 'Turns tracked spend into a business-case-ready ROI report using team size, hourly rate, and productivity benchmarks.' },
          ],
        },
        {
          heading: 'Simpler integration surface for cost-only needs',
          items: [
            { title: null, description: 'If you don\'t need routing and fallback chains, you don\'t need the complexity that comes with them.' },
          ],
        },
      ],
      faqs: [
        { question: 'Does Ordisum offer multi-provider routing?', answer: 'Ordisum routes every request through its Gateway and attributes cost per provider, but is not a routing/failover product. For multi-provider routing as a primary need, Portkey may be a better fit.' },
        { question: 'Do I need to install an SDK to use Ordisum?', answer: 'No — Ordisum integrates via a base-URL swap and an Ordisum API key, no SDK required.' },
      ],
      finalCta: {
        headline: 'Need budget enforcement over routing flexibility?',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'See all Features', href: '/features' },
      },
      relatedLinks: {
        heading: 'Explore more',
        links: [
          { label: 'See the full feature set', href: '/features', description: null },
          { label: 'AI Budget Management use case', href: '/use-cases/ai-budget-management', description: null },
        ],
      },
    },
  },

  // ── /alternatives/litellm ──────────────────────────────────────
  {
    slug: 'alternatives-litellm',
    title: 'Ordisum vs. LiteLLM',
    meta_title: 'Ordisum vs. LiteLLM: Managed Enforcement vs. Self-Hosted Proxy',
    meta_description: 'LiteLLM is a self-hosted, open-source LLM proxy. Ordisum is a managed platform built around hard budget enforcement and ROI reporting.',
    meta_keywords: 'LiteLLM alternative, managed AI gateway, AI budget enforcement',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'Ordisum vs. LiteLLM: Managed Enforcement vs. Self-Hosted Proxy',
        subheadline: 'LiteLLM is the right choice if you have DevOps capacity to run your own gateway and want zero vendor dependency. Ordisum is the right choice if you want budget enforcement and ROI reporting working on day one.',
      },
      intro: {
        heading: 'Open-source vs. managed',
        body: 'LiteLLM is a popular open-source proxy for teams with the DevOps capacity to self-host their own gateway layer and want zero platform fees. Ordisum is a managed platform — zero infrastructure, enforcement and reporting built in.',
      },
      comparisonTable: {
        heading: 'Side-by-side comparison',
        columns: ['', 'LiteLLM', 'Ordisum'],
        rows: [
          { label: 'Hosting', values: ['Self-hosted', 'Managed'] },
          { label: 'Budget enforcement', values: ['Requires custom build', 'Built in'] },
          { label: 'ROI reporting', values: ['Not built in', 'Built-in ROI Calculator'] },
          { label: 'Platform fee', values: ['None (ops overhead)', 'Yes (zero ops)'] },
        ],
      },
      sections: [
        {
          heading: 'Managed, Not Self-Hosted',
          items: [
            { title: null, description: 'No infrastructure to provision, patch, or scale. Ordisum is up and tracking your spend from the first API key swap.' },
          ],
        },
        {
          heading: 'Hard Budget Enforcement out of the box',
          items: [
            { title: null, description: 'LiteLLM requires custom build work to enforce budgets. Ordisum ships enforcement as a first-class feature.' },
          ],
        },
        {
          heading: 'ROI Calculator built in',
          items: [
            { title: null, description: 'LiteLLM has no equivalent. Ordisum\'s ROI Calculator turns tracked spend into a business case automatically.' },
          ],
        },
      ],
      faqs: [
        { question: 'Is Ordisum open-source?', answer: 'Ordisum is a managed SaaS platform. For open-source or self-hosting requirements, LiteLLM may be a better fit.' },
        { question: 'Do I need to install an SDK to use Ordisum?', answer: 'No — Ordisum integrates via a base-URL swap and an Ordisum API key, no SDK required.' },
      ],
      finalCta: {
        headline: 'Want enforcement without the infrastructure overhead?',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'See all Features', href: '/features' },
      },
      relatedLinks: {
        heading: 'Explore more',
        links: [
          { label: 'See the full feature set', href: '/features', description: null },
          { label: 'AI Budget Management use case', href: '/use-cases/ai-budget-management', description: null },
        ],
      },
    },
  },

  // ── /use-cases/ai-cost-monitoring ──────────────────────────────
  {
    slug: 'use-cases-ai-cost-monitoring',
    title: 'AI Cost Monitoring',
    meta_title: 'AI Cost Monitoring for Engineering Teams | Ordisum',
    meta_description: 'Track AI API spend per model, provider, team, and project — in real time, without per-provider console-hopping.',
    meta_keywords: 'AI cost monitoring, LLM cost tracking, AI API spend visibility',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'AI Cost Monitoring for Engineering Teams',
        subheadline: 'See exactly what your AI spend is doing, right now, across every provider — in one dashboard.',
      },
      intro: {
        heading: 'The problem with provider dashboards',
        body: 'You ship AI features across multiple providers and can\'t answer "what did this cost this week, and which feature drove it?" without manually cross-referencing provider consoles. Ordisum\'s Gateway meters every request in real time and attributes it to model, provider, team, and project — one dashboard, refreshed every 5 minutes.',
      },
      workflow: {
        heading: 'How it works',
        steps: [
          { title: 'Swap your base URL', description: 'Point your app at the Ordisum Gateway. No SDK, no code change beyond configuration.' },
          { title: 'Every request is metered', description: 'Token counts, cost, model, provider, team, and project are captured in real time.' },
          { title: 'Dashboard updates every 5 minutes', description: 'See live per-model, per-provider, per-team breakdowns without console-hopping.' },
          { title: 'Drill into any spike', description: 'Click into a cost spike to see which team or feature caused it, and when it started.' },
        ],
      },
      sections: [
        {
          heading: 'Benefits',
          items: [
            { title: 'Faster incident response', description: 'Cost spikes are visible within minutes, not discovered at month-end.' },
            { title: 'No console-hopping', description: 'OpenAI, Anthropic, Gemini, Azure, Bedrock, Groq, Mistral, Cohere — all in one place.' },
            { title: 'Clean attribution', description: 'Per-team, per-project spend for internal chargeback conversations.' },
          ],
        },
      ],
      faqs: [
        { question: 'Can I see cost broken down by team?', answer: 'Yes — attribution includes team and project.' },
        { question: 'How current is the data?', answer: 'The dashboard refreshes every 5 minutes.' },
        { question: 'Which providers are supported?', answer: 'OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere.' },
      ],
      finalCta: {
        headline: 'Stop console-hopping. Start tracking AI spend in one place.',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'See the Dashboard Feature', href: '/features' },
      },
      relatedLinks: {
        heading: 'Explore further',
        links: [
          { label: 'Dashboard feature details', href: '/features', description: null },
          { label: 'Using the Cost Dashboard (docs)', href: '/docs/dashboard', description: null },
          { label: 'Supported Providers (docs)', href: '/docs/providers', description: null },
        ],
      },
    },
  },

  // ── /use-cases/ai-budget-management ────────────────────────────
  {
    slug: 'use-cases-ai-budget-management',
    title: 'AI Budget Management',
    meta_title: 'AI Budget Management | Ordisum',
    meta_description: 'Stop AI budget overruns before they happen with hard limits, threshold alerts, and anomaly detection.',
    meta_keywords: 'AI budget management, stop AI overruns, LLM budget enforcement, OpenAI budget limit',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'AI Budget Management: Stop Overruns Before They Happen',
        subheadline: 'Set a limit. We enforce it — automatically, before the bill happens.',
      },
      intro: {
        heading: 'The problem with monthly alerts',
        body: 'A monthly spend alert tells finance about an overrun after the invoice is already generated. By then there\'s nothing to do but explain it. Set a hard monthly or quarterly limit in Ordisum; requests are automatically blocked before they push spend past it.',
      },
      workflow: {
        heading: 'How budget enforcement works',
        steps: [
          { title: 'Set a budget per team or project', description: 'Monthly or quarterly limits at the team or project level — not just account-wide.' },
          { title: 'Set alert channels', description: 'Choose Email, Slack, or SMS for threshold alerts at 50/75/90/100%.' },
          { title: 'Enforcement runs automatically', description: 'Requests are blocked before the limit is exceeded — no manual monitoring required.' },
          { title: 'Anomaly detection catches spikes', description: 'Fires when hourly spend exceeds 3× your 7-day rolling average — catching problems within the hour, not at month-end.' },
        ],
      },
      sections: [
        {
          heading: 'Benefits',
          items: [
            { title: 'No more surprise invoices', description: 'Spend stops at the limit you set, not after it.' },
            { title: 'Engineering moves fast', description: 'No approval bottlenecks on every deploy — the budget guardrail runs automatically.' },
            { title: 'Anomalies caught within the hour', description: 'Not discovered at month-end when there\'s nothing left to do.' },
          ],
        },
      ],
      faqs: [
        { question: 'What happens exactly when a budget is hit?', answer: 'Requests are auto-throttled/blocked before exceeding the limit you set.' },
        { question: 'What counts as an anomaly?', answer: 'Hourly spend exceeding 3× the 7-day rolling average.' },
        { question: 'Can I set different budgets for different teams?', answer: 'Yes — budgets and alerts are configurable per team and project.' },
      ],
      finalCta: {
        headline: 'Set a hard budget limit in minutes.',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'See all Features', href: '/features' },
      },
      relatedLinks: {
        heading: 'Explore further',
        links: [
          { label: 'Features: Budget Enforcement', href: '/features', description: null },
          { label: 'Setting Up Budget Alerts (docs)', href: '/docs/budget-alerts', description: null },
        ],
      },
    },
  },

  // ── /use-cases/ai-roi-measurement ──────────────────────────────
  {
    slug: 'use-cases-ai-roi-measurement',
    title: 'AI ROI Measurement',
    meta_title: 'AI ROI Calculator | Ordisum',
    meta_description: 'Turn your AI spend into a defensible ROI report using real usage data and productivity benchmarks.',
    meta_keywords: 'AI ROI calculator, LLM ROI measurement, AI investment ROI',
    robots: 'index,follow',
    is_published: true,
    content_blocks: {
      hero: {
        headline: 'Measuring the Real ROI of Your AI Spend',
        subheadline: 'Stop guessing whether your AI investment paid off. Calculate it.',
      },
      intro: {
        heading: 'The problem with AI budget reviews',
        body: 'Leadership approved an AI budget on faith. Six months in, nobody has a structured answer to "was it worth it?" The ROI Calculator combines actual spend data with team size, hourly rate, and productivity benchmarks to produce a defensible ROI figure — not a guess.',
      },
      workflow: {
        heading: 'How the ROI Calculator works',
        steps: [
          { title: 'Real spend is already tracked', description: 'Ordisum tracks every token and cost as requests flow through the Gateway.' },
          { title: 'Input team size and hourly rate', description: 'A proxy for what the equivalent human effort would have cost.' },
          { title: 'Get a business-case-ready report', description: 'A defensible ROI figure you can bring to a budget review, not a back-of-envelope estimate.' },
        ],
      },
      sections: [
        {
          heading: 'Benefits',
          items: [
            { title: 'A real number for the budget review', description: 'Not a guess. A figure built on your actual tracked spend and stated productivity assumptions.' },
            { title: 'Less friction on renewals', description: 'A structured ROI report makes renewing or expanding AI tooling budgets a data conversation, not a faith conversation.' },
          ],
        },
      ],
      faqs: [
        { question: 'What data feeds the ROI calculation?', answer: 'Your actual tracked AI spend, combined with team size, hourly rate, and productivity benchmarks.' },
        { question: 'Is there an ROI calculator for AI tools?', answer: 'Yes — Ordisum\'s ROI Calculator converts tracked spend into a business case using team size, hourly rate, and productivity benchmarks.' },
      ],
      finalCta: {
        headline: 'Turn your AI spend into a defensible ROI report.',
        primaryCta: { label: 'Start Free Trial', href: '/auth/signup' },
        secondaryCta: { label: 'See all Features', href: '/features' },
      },
      relatedLinks: {
        heading: 'Explore further',
        links: [
          { label: 'Features: ROI Calculator', href: '/features', description: null },
          { label: 'Using the ROI Calculator (docs)', href: '/docs/roi-calculator', description: null },
        ],
      },
    },
  },
];

// ────────────────────────────────────────────────────────────────
// BLOG POSTS (new post only — existing 2 are already in DB)
// ────────────────────────────────────────────────────────────────
const newBlogPosts = [
  {
    slug: 'best-ai-cost-management-tools',
    title: 'The Best AI Cost Management Tools in 2026',
    excerpt: 'A practical look at the leading AI cost management and observability tools in 2026 — what each is built for, and how to pick.',
    body: `# The Best AI Cost Management Tools in 2026

If your team ships more than one AI-powered feature, you've probably already hit the same wall: spend is scattered across provider consoles, nobody owns a single view of it, and "cost management" tools in this space don't all do the same job. Before picking one, it helps to know what you're actually comparing.

## What "AI cost management" actually covers

The category splits into a few distinct jobs that get marketed under one label:

- **Visibility** — seeing what you spent, broken down by model/provider/team.
- **Enforcement** — actually stopping spend before it crosses a line, not just reporting it afterward.
- **Evaluation/tracing** — debugging what a model actually did on a given request (a different job from cost control, though some tools bundle it in).
- **Routing** — sending requests across multiple providers/models for reliability or cost-optimization at the request level.

Most tools are strong at one or two of these, not all four. Knowing which job you actually need solves the "which tool" question faster than a feature checklist does.

## Tool-by-tool

**Helicone** — an AI gateway centered on observability: request logging, caching, and cost/latency visibility through a proxy integration. Good fit if visibility and caching are your main need.

**Langfuse** — open-source and self-hostable, built around detailed LLM tracing and evaluation, popular for debugging complex agent workflows. Best fit for teams whose main pain is understanding *why* a model did something, not just what it cost.

**Portkey** — positions itself as a control panel for production AI: multi-provider routing, fallback chains, and guardrails, with cost visibility as one part of a broader gateway. Best fit if you need routing/failover across providers as your primary requirement.

**LiteLLM** — a self-hosted, open-source proxy for teams with the DevOps capacity to run their own gateway and avoid platform fees. Best fit for teams that want full control and are comfortable building enforcement/reporting logic themselves.

**Ordisum** — built specifically around the *enforcement* and *ROI* jobs: hard budget limits that block requests before they're exceeded (not just alerts), anomaly detection, and a built-in ROI calculator that turns spend into a business case for finance. Zero-SDK integration — a base-URL swap. Best fit if your main pain isn't "we can't see the data," it's "we can't stop the overrun, and we can't answer whether this was worth it."

## How to choose

Ask what actually keeps you up at night. If it's "I don't know why the model produced that output," you want a tracing/evaluation tool like Langfuse. If it's "I need requests to fail over across providers," you want a routing tool like Portkey. If it's "finance is going to ask why the AI bill tripled and I have no way to have stopped it," that's the enforcement job Ordisum is built for.

## FAQ

**Do I need more than one of these tools?**
Possibly — visibility, tracing, routing, and enforcement are different jobs, and some teams run more than one tool for different needs.

**Which of these tools actually blocks spend before it happens?**
Confirm directly with each vendor's current docs before relying on this; Ordisum's hard budget enforcement blocks requests before a set limit is exceeded.

[See how Ordisum's budget enforcement works →](/features)`,
    meta_title: 'The Best AI Cost Management Tools in 2026',
    meta_description: 'A practical look at the leading AI cost management and observability tools in 2026 — what each is built for, and how to pick.',
    meta_keywords: 'ai cost management tools, ai cost monitoring, llm cost tracking',
    status: 'published',
    published_at: new Date().toISOString(),
    tags: ['AI Cost Management', 'LLM Tools', 'Budget Enforcement'],
  },
];

// ────────────────────────────────────────────────────────────────
// SITE LINKS — fix placeholder URLs
// ────────────────────────────────────────────────────────────────
const siteLinkUpdates = [
  // Company
  { section: 'company', label: 'Blog',     url: '/blog' },
  { section: 'company', label: 'About',    url: '/about' },
  { section: 'company', label: 'Contact',  url: '/contact-sales' },
  // Legal
  { section: 'legal',   label: 'Terms',         url: '/terms' },
  { section: 'legal',   label: 'Cookie Policy',  url: '/privacy-policy' },
  { section: 'legal',   label: 'GDPR',           url: '/privacy-policy' },
  { section: 'legal',   label: 'Security',       url: '/security' },
  { section: 'legal',   label: 'SLA',            url: '/contact-sales' },
  // Product
  { section: 'product', label: 'Changelog',      url: '/docs/changelog' },
  // Privacy Policy in legal table — fix localhost URL
  { section: 'legal',   label: 'Privacy Policy', url: '/privacy-policy' },
  // Social — LinkedIn was set to google.com
  { section: 'social',  label: 'LinkedIn',       url: 'https://linkedin.com/company/ordisum' },
  { section: 'social',  label: 'X (Twitter)',    url: 'https://twitter.com/ordisum' },
  { section: 'social',  label: 'GitHub',         url: 'https://github.com/ordisum' },
];

// ────────────────────────────────────────────────────────────────
// RUN
// ────────────────────────────────────────────────────────────────
async function run() {
  let errors = 0;

  // 1. Upsert static_pages
  console.log('\n═══ Upserting static_pages ═══');
  for (const page of staticPages) {
    const { error } = await supabase
      .from('static_pages')
      .upsert({ ...page }, { onConflict: 'slug', ignoreDuplicates: false });
    if (error) {
      console.error(`  ❌  ${page.slug}:`, error.message);
      errors++;
    } else {
      console.log(`  ✓  ${page.slug}`);
    }
  }

  // 2. Insert new blog posts (skip if slug already exists)
  console.log('\n═══ Inserting new blog posts ═══');
  for (const post of newBlogPosts) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('slug', post.slug)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭  ${post.slug} (already exists)`);
      continue;
    }

    const { error } = await supabase.from('blog_posts').insert(post);
    if (error) {
      console.error(`  ❌  ${post.slug}:`, error.message);
      errors++;
    } else {
      console.log(`  ✓  ${post.slug}`);
    }
  }

  // 3. Update site_links placeholder URLs
  console.log('\n═══ Updating site_links ═══');
  for (const link of siteLinkUpdates) {
    const { error } = await supabase
      .from('site_links')
      .update({ url: link.url })
      .eq('section', link.section)
      .eq('label', link.label);
    if (error) {
      console.error(`  ❌  ${link.section}/${link.label}:`, error.message);
      errors++;
    } else {
      console.log(`  ✓  ${link.section}/${link.label} → ${link.url}`);
    }
  }

  console.log(`\n${ errors === 0 ? '✅  All done — no errors.' : `⚠️  Done with ${errors} error(s). Review output above.` }`);
  process.exit(errors > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
