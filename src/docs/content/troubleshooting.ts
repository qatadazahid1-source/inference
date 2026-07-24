import { DocPage } from './types'

export const troubleshootingPage: DocPage = {
  slug: 'troubleshooting',
  title: 'Troubleshooting',
  description:
    'Solutions to the most common issues with Inference Intelligence.',

  sections: [
    {
      id: 'no-data',
      heading: 'Dashboard Shows No Data After Connecting a Provider',
      body:
        'This is the most common issue. Try these steps in order:',
      list: [
        'Wait 5 minutes — provider APIs can be slow on first connection',
        'Click the refresh icon in the top-right of the dashboard',
        'Confirm your provider account has at least some usage in the last 30 days',
        'Go to Providers and check the connection status dot (should be green)',
        'Re-enter your API key — it may have been entered with an extra space',
      ],
      callout: {
        type: 'info',
        title: 'New accounts with no usage',
        text:
          'If your AI provider account has zero usage, there is nothing to show. ' +
          'Make a few test API calls on the provider side, wait 5 minutes, then refresh.',
      },
    },
    {
     id: 'connection-error',
      heading: 'Provider Shows "Connection Error" Status',
      table: {
        headers: ['Error Message', 'Likely Cause', 'Fix'],
        rows: [
          ['Invalid API key',          'Key was entered wrong or rotated',       'Re-generate key in provider console and re-enter'],
          ['Insufficient permissions', 'Key missing usage/billing read scope',   'Create new key with correct scopes'              ],
          ['Rate limited',             'Too many requests to provider API',      'Wait 10 minutes, then retry connection'          ],
          ['Network timeout',          'Provider API is temporarily unavailable','Try again in a few minutes'                      ],
        ],
      },
    },
    {
      id: 'wrong-costs',
      heading: 'Costs Look Wrong or Different from Provider Console',
      body:
        'Small differences (under 2%) are normal due to rounding in provider APIs. ' +
        'Larger differences usually have one of these causes:',
      list: [
        'Currency — provider may bill in USD but report in local currency. Check your provider billing settings.',
        'Taxes — some providers add taxes to invoices that are not in the usage API.',
        'Credits — promotional credits applied in the provider console reduce your invoice but not our usage data.',
        'Time zones — provider may use a different day boundary. We use UTC.',
      ],
    },
    {
      id: 'missing-models',
      heading: 'Some Models Not Showing in Breakdown',
      body:
        'Not all providers expose per-model cost data in their API. ' +
        'If a model is not broken out individually, its costs are grouped under the provider total.',
      callout: {
        type: 'tip',
        title: 'OpenAI organization accounts',
        text:
          'If your OpenAI is set up as an organization, make sure your API key ' +
          'has access to organization-level usage data, not just project-level.',
      },
    },
    {
      id: 'alerts-not-sending',
      heading: 'Budget Alerts Not Being Delivered',
      list: [
        'Check Settings → Notifications to confirm channels are connected',
        'Verify your email is not filtering alerts to spam',
        'For Slack: re-authorize the Slack integration (tokens expire)',
        'For SMS: verify your phone number is confirmed in your profile',
        'Check the Alerts page to confirm alerts are being generated',
      ],
    },
    {
      id: 'contact',
      heading: 'Still Having Issues?',
      body:
        'Email support@inferenceintelligence.com with your workspace ID ' +
        '(found in Settings → General) and a description of the problem. ' +
        'Include a screenshot if possible.',
      callout: {
        type: 'tip',
        title: 'Faster support',
        text:
          'Professional and above plans get priority support. ' +
          'Include "PRIORITY" in your subject line to route to the fast queue.',
      },
    },
  ],

  prev: { label: 'FAQ', path: '/docs/faq' },
  next: undefined,
}