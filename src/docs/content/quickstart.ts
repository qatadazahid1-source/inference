import { DocPage } from './types'

export const quickstartPage: DocPage = {
  slug: 'quickstart',
  title: 'Quickstart',
  description: 'Get Ordisum tracking your AI spend in minutes — no SDK required.',

  sections: [
    {
      id: 'sign-up',
      heading: 'Step 1 — Sign Up',
      body:
        'Create a free account at app.ordisum.com. ' +
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
      id: 'make-first-request',
      heading: 'Step 3 — Make Your First Request',
      body:
        'Instead of calling OpenAI or Anthropic directly, point your SDK to our Gateway URL ' +
        'and use your Ordisum platform key. We handle the rest.',
      code: {
        language: 'bash',
        code: `curl https://api.inference-intelligence.com/v1/chat/completions \\
  -H "Authorization: Bearer ii_live_your_platform_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello world!"}]
  }'`,
      },
      callout: {
        type: 'tip',
        title: 'Instant Telemetry',
        text: [
          'By routing your AI traffic through Ordisum, you get real-time tracking of every token and cost without any SDK integration.',
          'Your API keys for OpenAI, Anthropic, etc. are securely stored in our dashboard. We append them automatically when forwarding requests.',
        ].join('\n\n'),
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