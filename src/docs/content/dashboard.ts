import { DocPage } from './types'

export const dashboardPage: DocPage = {
  slug: 'dashboard',
  title: 'Dashboard',
  description: 'How to read and use the Ordisum cost dashboard.',

  sections: [
    {
      id: 'layout',
      heading: 'Dashboard Layout',
      body:
        'The dashboard is divided into four main areas: the top metrics bar, ' +
        'the provider cost breakdown table, the trend charts, and the alert panel.\n\n' +
        'Everything on the dashboard updates in real time as your AI providers ' +
        'report new usage data. Most providers report with a 5-minute delay.',
      callout: {
        type: 'info',
        title: 'Data refresh rate',
        text:
          'Dashboard data refreshes every 5 minutes automatically. ' +
          'Click the refresh icon in the top-right to force an immediate update.',
      },
    },
    {
      id: 'top-metrics',
      heading: 'Top Metrics Bar',
      body: 'The metrics bar shows your three most important numbers at a glance:',
      table: {
        headers: ['Metric', 'What It Shows', 'Time Period'],
        rows: [
          ['Total Monthly Spend', 'Sum of all provider costs this calendar month', 'MTD'],
          ['Proven ROI',          'Net savings ÷ AI cost × 100',                  'Current quarter'],
          ['Active Providers',    'Number of connected and reporting providers',   'Live'],
          ['Budget Used',         'Current spend vs your total monthly budget',    'MTD'],
        ],
      },
    },
    {
      id: 'provider-table',
      heading: 'Provider Cost Breakdown',
      body:
        'The provider table shows cost, change percentage, and a visual usage bar ' +
        'for every connected provider. You can sort by any column by clicking the header.',
      list: [
        'Green dot — provider is active and reporting normally',
        'Amber dot — provider is throttled or has a usage warning',
        'Red dot — provider connection error or key expired',
        'Click any provider row to drill into model-level breakdown',
      ],
    },
    {
      id: 'trend-charts',
      heading: 'Trend Charts',
      body:
        'Below the provider table, three charts show your spending trends over time. ' +
        'Toggle between 7 days, 30 days, and 90 days using the buttons above each chart.',
      list: [
        'Daily Spend — bar chart showing cost per day',
        'Provider Mix — stacked area chart showing how spend shifts between providers',
        'ROI Trend — line chart showing your running ROI percentage over time',
      ],
    },
    {
      id: 'alert-panel',
      heading: 'Alert Panel',
      body:
        'The alert panel in the bottom-right shows the three most recent alerts. ' +
        'Click "View All" to go to the full Alerts page. ' +
        'A pulsing red dot means there is at least one unresolved critical alert.',
      callout: {
        type: 'warning',
        title: 'Critical alerts',
        text:
          'Cost anomaly alerts (sudden spikes above 200% of your 7-day average) ' +
          'are sent immediately via all configured channels — even outside business hours.',
      },
    },
    {
      id: 'workspace-switcher',
      heading: 'Workspace Switcher',
      body:
        'If you belong to multiple organizations, use the workspace switcher in ' +
        'the top-left corner to switch between them. Each workspace has its own ' +
        'providers, budgets, and team members.',
    },
  ],

  prev: { label: 'Connecting Providers', path: '/docs/providers'      },
  next: { label: 'Budget Alerts',         path: '/docs/budget-alerts'  },
}