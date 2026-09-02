import { DocPage } from './types'

export const budgetAlertsPage: DocPage = {
  slug: 'budget-alerts',
  title: 'Budget Alerts',
  description: 'Set up hard budget limits and threshold/anomaly alerts.',

  sections: [
    {
      id: 'overview',
      heading: 'Overview',
      body:
        'Budget alerts let you define spending limits at any level: per provider, ' +
        'per team, per project, or for your entire organization. ' +
        'When spend crosses a threshold, alerts are sent through your configured channels.',
      callout: {
        type: 'tip',
        title: 'Recommended setup',
        text:
          'Start with a 75% warning alert and a 95% critical alert for each provider. ' +
          'This gives you time to act before hitting your limit.',
      },
    },
    {
      id: 'creating-budget',
      heading: 'Creating a Budget',
      body:
        'Go to Budgets in the left sidebar and click "Create Budget". ' +
        'Fill in the budget name, scope, limit, and alert thresholds.',
      code: {
        filename: 'Example budget configuration',
        language: 'json',
        code: `{
  "name": "OpenAI Production Budget",
  "scope": "provider",
  "provider": "openai",
  "limit_usd": 8000,
  "period": "monthly",
  "alerts": [
    {
      "threshold_percent": 50,
      "channels": ["email"]
    },
    {
      "threshold_percent": 75,
      "channels": ["email", "slack"]
    },
    {
      "threshold_percent": 90,
      "channels": ["email", "slack", "sms"]
    },
    {
      "threshold_percent": 100,
      "channels": ["email", "slack", "sms"],
      "action": "throttle"
    }
  ]
}`,
      },
    },
    {
      id: 'budget-scopes',
      heading: 'Budget Scopes',
      body: 'Budgets can be scoped at four levels:',
      table: {
        headers: ['Scope', 'Covers', 'Example Use Case'],
        rows: [
          ['Organization', 'All providers, all teams',       'Total AI spend cap for the company'       ],
          ['Provider',     'One provider across all teams',  'OpenAI monthly limit'                     ],
          ['Team',         'All providers for one team',     'Engineering team AI budget'               ],
          ['Project',      'Costs tagged to one project',   'Single product feature cost tracking'     ],
        ],
      },
    },
    {
      id: 'alert-channels',
      heading: 'Alert Channels',
      body:
        'Configure where alerts are delivered in Settings → Notifications. ' +
        'Each channel must be connected before it can be used in budgets.',
      list: [
        'Email — sent to all admin users by default, or specific addresses',
        'Slack — requires Slack integration (see Slack docs)',
        'SMS — requires a verified phone number in your profile',
        'Webhook — POST request to any URL you specify',
      ],
    },
    {
      id: 'hard-limits',
      heading: 'Hard Limits (Auto-Throttle)',
      body:
        'When a budget has a 100% threshold with action: "throttle", ' +
        'Ordisum will automatically stop forwarding requests to ' +
        'that provider until the next billing period begins.',
      callout: {
        type: 'danger',
        title: 'Hard limits affect production traffic',
        text:
          'Enabling auto-throttle on a production provider will cause requests ' +
          'to fail once the budget is reached. Use only on non-critical workloads ' +
          'or when you have a fallback provider configured.',
      },
    },
    {
      id: 'anomaly-alerts',
      heading: 'Anomaly Detection Alerts',
      body:
        'Separate from budget alerts, anomaly detection runs continuously and ' +
        'fires when your spend pattern deviates significantly from your baseline.\n\n' +
        'An anomaly alert fires when hourly spend exceeds 3× your 7-day rolling average ' +
        'for that same hour. This catches runaway API loops and unexpected usage spikes ' +
        'before they exhaust your budget.',
      code: {
        filename: 'Anomaly alert example (Slack message)',
        language: 'json',
        code: `{
  "type": "anomaly_alert",
  "provider": "openai",
  "model": "gpt-4o",
  "current_hourly_spend": 847.20,
  "baseline_hourly_spend": 211.80,
  "deviation_percent": 300,
  "triggered_at": "2024-10-15T14:32:00Z",
  "dashboard_url": "https://app.ordisum.com/alerts/123"
}`,
      },
    },
  ],

  prev: { label: 'Dashboard Overview',  path: '/docs/dashboard'       },
  next: { label: 'ROI Calculator',       path: '/docs/roi-calculator'  },
}