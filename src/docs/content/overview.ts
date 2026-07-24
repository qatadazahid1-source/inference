import { DocPage } from './types'

export const overviewPage: DocPage = {
  slug: 'overview',
  title: 'Overview',
  description: 'Inference Intelligence gives you complete visibility into every AI inference dollar you spend.',

  sections: [
    {
      id: 'what-it-does',
      heading: 'What It Does',
      body:
        'Inference Intelligence is a cost intelligence platform that sits alongside your existing AI stack. ' +
        'Connect OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, and more. ' +
        'See unified cost dashboards, configure per-provider and per-team budgets, ' +
        'detect cost anomalies in real time, and calculate the ROI of your AI investment — all in one place.',
    },
    {
      id: 'why-it-matters',
      heading: 'Why It Matters',
      body:
        'AI spend is growing faster than engineering teams can track it. ' +
        'Individual developers use multiple providers. Entire teams share a handful of API keys. ' +
        'By the time an anomaly appears on a monthly invoice, the damage is done.\n\n' +
        'Inference Intelligence gives your finance team and engineering leads the data they need ' +
        'to make smart decisions about where to allocate AI resources.',
      callout: {
        type: 'info',
        title: 'Data never leaves your account',
        text:
          'Inference Intelligence uses read-only API access to your AI provider accounts. ' +
          'We never write to your provider accounts or store your prompts, completions, or model outputs.',
      },
    },
    {
      id: 'key-features',
      heading: 'Key Features',
      list: [
        'Unified multi-provider dashboard — one view across all your AI spend',
        'Per-team and per-project budget limits with threshold alerts',
        'Real-time anomaly detection (fires when spend spikes 3× above your 7-day average)',
        'ROI calculator backed by published productivity research',
        'CSV and XLSX export for finance teams and board reports',
        'Team roles: Owner, Admin, Member, Viewer',
        'REST API for integrating with your existing tooling',
      ],
    },
    {
      id: 'how-it-connects',
      heading: 'How It Connects',
      body:
        'No agents. No SDKs. No code changes required. ' +
        'Inference Intelligence connects to each AI provider using their official usage API — ' +
        'the same read-only endpoints the providers expose for billing dashboards.\n\n' +
        'You provide read-only API keys. We read cost and usage data. Nothing else.',
      callout: {
        type: 'tip',
        title: 'Provider compatibility',
        text:
          'We currently support OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere. ' +
          'Hugging Face and Replicate are on the roadmap.',
      },
    },
    {
      id: 'how-data-updates',
      heading: 'How Data Updates',
      body: 'Usage data updates every 5 minutes from each provider. Here is how it works:',
      table: {
        headers: ['Provider', 'Update Frequency', 'Granularity'],
        rows: [
          ['OpenAI',       'Every 5 minutes', 'Per model, per day'],
          ['Anthropic',    'Every 5 minutes', 'Per model, per day'],
          ['Google Gemini','Every 5 minutes', 'Per model, per day'],
          ['Azure OpenAI', 'Every 5 minutes', 'Per model, per day'],
          ['AWS Bedrock',  'Every 15 minutes','Per model, per day'],
        ],
      },
    },
  ],

  prev: undefined,
  next: { label: 'Quickstart', path: '/docs/quickstart' },
}