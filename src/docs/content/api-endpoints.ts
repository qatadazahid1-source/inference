import { DocPage } from './types'

export const apiEndpointsPage: DocPage = {
  slug: 'api-endpoints',
  title: 'API Endpoints',
  description: 'Full reference for the Ordisum API.',

  sections: [
    {
      id: 'base-url',
      heading: 'Base URL',
      code: {
        language: 'bash',
        code: `https://api.ordisum.com/v1`,
      },
    },
    {
      id: 'costs',
      heading: 'Cost Endpoints',
      table: {
        headers: ['Method', 'Endpoint', 'Description'],
        rows: [
          ['GET',  '/costs/summary',          'Monthly cost summary across all providers'   ],
          ['GET',  '/costs/by-provider',      'Cost breakdown per provider'                 ],
          ['GET',  '/costs/by-model',         'Cost breakdown per model'                    ],
          ['GET',  '/costs/by-team',          'Cost breakdown per department'               ],
          ['GET',  '/costs/daily',            'Day-by-day cost history (up to 90 days)'     ],
        ],
      },
    },
    {
      id: 'budgets-endpoints',
      heading: 'Budget Endpoints',
      table: {
        headers: ['Method', 'Endpoint', 'Description'],
        rows: [
          ['GET',    '/budgets',          'List all budgets in your workspace'       ],
          ['POST',   '/budgets',          'Create a new budget'                      ],
          ['GET',    '/budgets/:id',      'Get a specific budget by ID'              ],
          ['PATCH',  '/budgets/:id',      'Update budget limit or thresholds'        ],
          ['DELETE', '/budgets/:id',      'Delete a budget'                          ],
        ],
      },
    },
    {
      id: 'alerts-endpoints',
      heading: 'Alert Endpoints',
      table: {
        headers: ['Method', 'Endpoint', 'Description'],
        rows: [
          ['GET',   '/alerts',          'List all alerts (newest first)'          ],
          ['GET',   '/alerts/unread',   'List only unresolved alerts'             ],
          ['PATCH', '/alerts/:id',      'Mark an alert as resolved'               ],
        ],
      },
    },
    {
      id: 'response-format',
      heading: 'Response Format',
      body: 'All endpoints return JSON. Successful responses follow this structure:',
      code: {
        filename: 'Success response',
        language: 'json',
        code: `{
  "success": true,
  "data": { },
  "meta": {
    "request_id": "req_xxxxxxxxxxxx",
    "timestamp": "2024-10-15T14:32:00Z"
  }
}`,
      },
    },
    {
      id: 'error-format',
      heading: 'Error Format',
      code: {
        filename: 'Error response',
        language: 'json',
        code: `{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Your API key does not have the read:budgets scope.",
    "docs_url": "https://ordisum.com/docs/api-auth"
  },
  "meta": {
    "request_id": "req_xxxxxxxxxxxx",
    "timestamp": "2024-10-15T14:32:00Z"
  }
}`,
      },
    },
  ],

  prev: { label: 'Authentication',  path: '/docs/api-auth'          },
  next: { label: 'Rate Limits',      path: '/docs/api-rate-limits'   },
}