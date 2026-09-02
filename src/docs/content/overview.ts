import { DocPage } from './types'

export const overviewPage: DocPage = {
  slug: 'overview',
  title: 'Overview',
  description: 'What Ordisum is and how the Gateway fits into your stack.',

  sections: [
    {
      id: 'what-it-does',
      heading: 'What It Does',
      body: 'Ordisum provides a unified GraphQL & REST Gateway. We sit between your application and various AI providers (OpenAI, Anthropic, Google, Mistral). You send your requests to our Gateway, and we route them to the appropriate model, handling API keys, tracking latency, applying budget limits, and aggregating costs in real time.',
    },
    {
      id: 'why-it-matters',
      heading: 'Why It Matters',
      body:
        'AI spend is growing faster than engineering teams can track it. ' +
        'Individual developers use multiple providers. Entire teams share a handful of API keys. ' +
        'By the time an anomaly appears on a monthly invoice, the damage is done.\n\n' +
        'Ordisum gives your finance team and engineering leads the data they need ' +
        'to make smart decisions about where to allocate AI resources.',
      callout: {
        type: 'info',
        title: 'Core Features',
        text:
          '**Unified Gateway**: Send all inference requests to `https://api.inference-intelligence.com/v1/chat/completions`. We handle the routing based on the model name.\n' +
          '**Zero-Code Instrumentation**: Just change your base URL and use our API key. We automatically track every token and millisecond of latency.\n' +
          '**Budget Enforcement**: Hard stop limits prevent unexpected bills if a model spikes or a key leaks.',
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
        'Ordisum connects to each AI provider using their official usage API — ' +
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