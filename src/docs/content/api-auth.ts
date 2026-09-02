import { DocPage } from './types'

export const apiAuthPage: DocPage = {
  slug: 'api-auth',
  title: 'API Authentication',
  description: 'Authenticate requests to the Ordisum API and Gateway.',

  sections: [
    {
      id: 'overview',
      heading: 'Overview',
      body:
        'The Ordisum API uses Bearer token authentication. ' +
        'All requests must include a valid API key in the Authorization header. ' +
        'API keys are scoped to your workspace and carry the permissions of the ' +
        'user who created them.',
      callout: {
        type: 'danger',
        title: 'Keep your API key secret',
        text:
          'Never expose your API key in client-side code, public repositories, ' +
          'or logs. Rotate it immediately if you suspect it has been compromised.',
      },
    },
    {
      id: 'generating-key',
      heading: 'Generating an API Key',
      body:
        'Go to Settings → API Keys → Generate New Key. ' +
        'Give it a descriptive name and select the permissions scope. ' +
        'Copy the key immediately — it is shown only once.',
      code: {
        filename: 'Store your key securely',
        language: 'bash',
        code: `# Add to your environment variables — never hardcode
export II_API_KEY="ii_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"`,
      },
    },
    {
      id: 'making-requests',
      heading: 'Making Authenticated Requests',
      body: 'Include your API key in the Authorization header of every request:',
      code: {
        filename: 'Example API request',
        language: 'bash',
        code: `curl https://api.ordisum.com/v1/costs/summary \\
  -H "Authorization: Bearer $II_API_KEY" \\
  -H "Content-Type: application/json"`,
      },
    },
    {
      id: 'typescript-example',
      heading: 'TypeScript / JavaScript Example',
      code: {
        filename: 'api-client.ts',
        language: 'typescript',
        code: `const BASE_URL = 'https://api.ordisum.com/v1'

async function fetchCostSummary() {
  const response = await fetch(\`\${BASE_URL}/costs/summary\`, {
    headers: {
      'Authorization': \`Bearer \${process.env.II_API_KEY}\`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(\`API error: \${response.status}\`)
  }

  return response.json()
}`,
      },
    },
    {
      id: 'key-scopes',
      heading: 'API Key Scopes',
      table: {
        headers: ['Scope', 'Access Level', 'Recommended For'],
        rows: [
          ['read:costs',    'Read cost and usage data',          'Dashboards, reporting tools'],
          ['read:budgets',  'Read budget configurations',        'Monitoring scripts'         ],
          ['write:budgets', 'Create and update budgets',         'Automation pipelines'       ],
          ['read:team',     'Read team and member information',  'HR integrations'            ],
          ['admin',         'Full access (use with caution)',    'Backend services only'      ],
        ],
      },
    },
    {
      id: 'errors',
      heading: 'Authentication Errors',
      table: {
        headers: ['Status Code', 'Error', 'Fix'],
        rows: [
          ['401', 'Unauthorized',  'API key is missing or invalid. Check the Authorization header.'  ],
          ['403', 'Forbidden',     'API key does not have the required scope for this endpoint.'      ],
          ['429', 'Rate Limited',  'Too many requests. See Rate Limits documentation.'                ],
        ],
      },
    },
  ],

  prev: { label: 'Exporting Reports', path: '/docs/exports'          },
  next: { label: 'API Endpoints',      path: '/docs/api-endpoints'    },
}