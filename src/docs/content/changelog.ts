import { DocPage } from './types'

export const changelogPage: DocPage = {
  slug: 'changelog',
  title: 'Changelog',
  description: "What's new in Ordisum.",

  sections: [
    {
      id: 'v1-4-0',
      heading: 'v1.4.0 — October 2024',
      list: [
        'NEW: Groq integration — track Mixtral and Llama costs in real time',
        'NEW: ROI Calculator now includes onboarding and rework savings',
        'NEW: Anomaly detection alerts with configurable sensitivity',
        'IMPROVED: Dashboard loads 40% faster on workspaces with 10+ providers',
        'IMPROVED: Budget alert emails now include a direct link to the alert',
        'FIX: Azure OpenAI costs were being double-counted for some regions',
        'FIX: CSV export now correctly handles commas in model names',
      ],
    },
    {
      id: 'v1-3-0',
      heading: 'v1.3.0 — September 2024',
      list: [
        'NEW: Department budgets — set spend limits per team',
        'NEW: 90-day cost history on Professional plans and above',
        'NEW: Webhook alerts — POST cost anomalies to any URL',
        'IMPROVED: Provider connection test now gives specific error messages',
        'FIX: Google Gemini Flash costs were using Gemini Pro pricing',
      ],
    },
    {
      id: 'v1-2-0',
      heading: 'v1.2.0 — August 2024',
      list: [
        'NEW: AWS Bedrock integration',
        'NEW: XLSX export format',
        'NEW: Team roles — Viewer role for read-only dashboard access',
        'IMPROVED: Slack alerts now include provider and model breakdown',
        'FIX: Rate limit errors no longer show as connection errors',
      ],
    },
    {
      id: 'v1-0-0',
      heading: 'v1.0.0 — July 2024',
      body: 'Initial public release.',
      list: [
        'OpenAI, Anthropic, Google Gemini, Azure OpenAI support',
        'Real-time cost dashboard',
        'Budget alerts via email and Slack',
        'CSV export',
        'Basic ROI Calculator',
        'Team management with Admin and Member roles',
      ],
    },
  ],

  prev: { label: 'Quickstart', path: '/docs/quickstart' },
  next: { label: 'Overview',   path: '/docs/overview'   },
}