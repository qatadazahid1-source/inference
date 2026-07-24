import { DocPage } from './types'

export const quickstartPage: DocPage = {
  slug: 'quickstart',
  title: 'Quickstart',
  description: 'Get Inference Intelligence running in under 5 minutes. No code changes required.',

  sections: [
    {
      id: 'sign-up',
      heading: 'Step 1 — Sign Up',
      body:
        'Create a free account at app.inferenceintelligence.com. ' +
        'You will be prompted to create your first workspace. ' +
        'A workspace maps to a single organization or team.',
      callout: {
        type: 'info',
        title: 'Workspaces',
        text:
          'Each workspace is isolated. If you work across multiple organizations, ' +
          'create a separate workspace for each one and switch between them from the top-left corner.',
      },
    },
    {
      id: 'connect-first-provider',
      heading: 'Step 2 — Connect Your First Provider',
      body:
        'Go to the Providers page and click "Add Provider". ' +
        'Select your AI provider and paste a read-only API key. ' +
        'We verify the key immediately and show a live connection status.',
      code: {
        filename: 'Where to find your API keys',
        language: 'json',
        code: `OpenAI       → platform.openai.com/api_keys
Anthropic    → console.anthropic.com/settings/keys
Google Gemini→ aistudio.google.com/app/apikey
Azure OpenAI → portal.azure.com → AI Services → Keys
AWS Bedrock  → AWS Console → Bedrock → Model access`,
      },
    },
    {
      id: 'verify-data',
      heading: 'Step 3 — Verify Your Data',
      body:
        'After connecting, wait about 5 minutes for the first data sync. ' +
        'Go to the Dashboard to see your total spend, provider breakdown, and trend charts.',
      callout: {
        type: 'tip',
        title: 'No data after 5 minutes?',
        text:
          'Check that your provider account has at least some usage in the last 30 days. ' +
          'New accounts with zero API calls will show an empty dashboard. ' +
          'See Troubleshooting if the status dot shows red.',
      },
    },
    {
      id: 'set-first-budget',
      heading: 'Step 4 — Set Your First Budget',
      body:
        'Go to Budgets and click "Create Budget". ' +
        'Set a monthly limit and alert thresholds (e.g., 75% and 90%). ' +
        'We recommend starting with a 75% warning to give yourself time to act.',
      code: {
        filename: 'Example: OpenAI monthly budget',
        language: 'json',
        code: `{
  "name": "OpenAI Production",
  "scope": "provider",
  "provider": "openai",
  "limit_usd": 5000,
  "period": "monthly",
  "alerts": [
    { "threshold_percent": 75, "channels": ["email"] },
    { "threshold_percent": 90, "channels": ["email", "slack"] }
  ]
}`,
      },
    },
    {
      id: 'invite-team',
      heading: 'Step 5 — Invite Your Team',
      body:
        'Go to Settings → Team → Invite Member. ' +
        'Enter your colleague\'s email and choose a role. ' +
        'They will receive an invite link valid for 7 days.',
      table: {
        headers: ['Role', 'What They Can Do'],
        rows: [
          ['Admin',  'Invite members, create budgets, view all data'         ],
          ['Member', 'View dashboard and their own team\'s costs'             ],
          ['Viewer', 'Read-only access to the dashboard'                      ],
        ],
      },
    },
  ],

  prev: { label: 'Overview',   path: '/docs/overview'  },
  next: { label: 'Providers',  path: '/docs/providers' },
}