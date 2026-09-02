import { DocPage } from './types'

export const teamsPage: DocPage = {
  slug: 'teams',
  title: 'Teams',
  description: 'Manage teams and projects for cost attribution.',

  sections: [
    {
      id: 'roles',
      heading: 'Roles & Permissions',
      table: {
        headers: ['Role', 'Can Do', 'Cannot Do'],
        rows: [
          ['Owner',  'Everything including billing and deletion',  'Nothing restricted'                          ],
          ['Admin',  'Invite members, create budgets, view all',   'Change billing, delete workspace'            ],
          ['Member', 'View dashboard, view their team costs',      'Create budgets, invite others, view API keys'],
          ['Viewer', 'View dashboard only (read-only)',            'Everything else'                             ],
        ],
      },
    },
    {
      id: 'inviting',
      heading: 'Inviting Team Members',
      body:
        'Go to Settings → Team → Invite Member. Enter the email address and ' +
        'select a role. The invite expires after 7 days.',
      callout: {
        type: 'info',
        title: 'SSO on Team and Enterprise plans',
        text:
          'Team and Enterprise plans support SSO via SAML 2.0. ' +
          'Members who sign in through your identity provider are provisioned ' +
          'automatically with the Member role. Admins can then promote them.',
      },
    },
    {
      id: 'departments',
      heading: 'Departments',
      body:
        'Departments group team members for cost attribution and budget controls. ' +
        'A member can belong to one department. ' +
        'Department-level costs are shown on the dashboard and in reports.',
      list: [
        'Create departments in Settings → Departments',
        'Assign members to departments from the Team page',
        'Set a monthly AI budget per department',
        'Department costs are auto-tagged in all exports',
      ],
    },
    {
      id: 'removing',
      heading: 'Removing a Member',
      body:
        'Go to Settings → Team, find the member, and click "Remove". ' +
        'Their historical data and cost attribution is preserved. ' +
        'Their access is revoked immediately.',
      callout: {
        type: 'warning',
        title: 'Billing impact',
        text:
          'On the Team plan, seats are billed monthly. Removing a member ' +
          'mid-month does not issue a prorated refund for that month.',
      },
    },
  ],

  prev: { label: 'ROI Calculator',   path: '/docs/roi-calculator' },
  next: { label: 'Exporting Reports', path: '/docs/exports'        },
}