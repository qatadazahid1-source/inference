import { DocPage } from './types'

export const roiCalculatorDocPage: DocPage = {
  slug: 'roi-calculator',
  title: 'ROI Calculator',
  description: 'How the ROI Calculator turns spend into a business case.',

  sections: [
    {
      id: 'overview',
      heading: 'Overview',
      body:
        'The ROI Calculator converts your raw AI spend data into a defensible ' +
        'business case. It combines your actual usage costs with team size, ' +
        'hourly rates, and productivity benchmarks to produce a single ROI figure ' +
        'you can present to leadership.',
    },
    {
      id: 'inputs',
      heading: 'Calculator Inputs',
      table: {
        headers: ['Input', 'What It Means', 'Default'],
        rows: [
          ['Monthly AI Spend',        'Total across all connected providers',           'Auto-filled from dashboard' ],
          ['Team Size',               'People who use AI tools daily',                 'You set this'               ],
          ['Average Hourly Rate',     'Blended hourly cost per team member',           'You set this'               ],
          ['Primary Use Case',        'What your team uses AI for most',               'Code Generation'            ],
          ['Weekly Manual Hours',     'Hours per person on repetitive tasks',          'You set this'               ],
          ['Departments Using AI',    'How many teams are included',                   'You set this'               ],
          ['AI Adoption Maturity',    'How consistently your team uses AI tools',      'Beginner'                   ],
        ],
      },
    },
    {
      id: 'formula',
      heading: 'Core Formula',
      body: 'The calculator uses this formula to compute net annual savings:',
      code: {
        filename: 'ROI calculation logic',
        language: 'typescript',
        code: `// Base time savings from use case efficiency
const hoursSavedPerMonth   = teamSize * 160 * efficiencyRate
const valueSavedPerYear    = hoursSavedPerMonth * 12 * hourlyRate

// Additional savings
const toolConsolidationSavings = currentToolsCount * 150 * 12
const onboardingSavings        = newHiresPerYear * onboardingHours * 0.35 * hourlyRate
const reworkSavings            = teamSize * 160 * 12 * reworkRate * 0.40 * hourlyRate

// Total benefit and ROI
const totalBenefit    = (valueSavedPerYear + toolConsolidationSavings
                         + onboardingSavings + reworkSavings) * deptMultiplier
const netSavings      = totalBenefit - (monthlySpend * 12)
const roiPercent      = (netSavings / (monthlySpend * 12)) * 100`,
      },
    },
    {
      id: 'efficiency-rates',
      heading: 'Efficiency Rates by Use Case',
      body:
        'Each use case has a different efficiency multiplier based on ' +
        'McKinsey and Stanford AI productivity research.',
      table: {
        headers: ['Use Case', 'Efficiency Rate', 'Source Benchmark'],
        rows: [
          ['Customer Support',   '52%', 'Support teams save avg 4.1 hrs/day'],
          ['Education/Training', '48%', 'Educators save avg 3.7 hrs/day'    ],
          ['IT Operations',      '46%', 'IT teams save avg 3.6 hrs/day'     ],
          ['Content Creation',   '45%', 'Writers save avg 3.5 hrs/day'      ],
          ['Code Generation',    '42%', 'Developers save avg 3.2 hrs/day'   ],
          ['HR & Recruitment',   '44%', 'HR teams save avg 3.4 hrs/day'     ],
          ['Data Analysis',     '38%', 'Analysts save avg 2.8 hrs/day'     ],
          ['Financial Analysis', '36%', 'Finance teams save avg 2.7 hrs/day'],
        ],
      },
    },
    {
      id: 'interpreting-results',
      heading: 'Interpreting Your Results',
      callout: {
        type: 'info',
        title: 'Conservative estimates',
        text:
          'All efficiency rates use the lower bound of published research ranges. ' +
          'Real results are often higher, especially after 3+ months of adoption.',
      },
      list: [
        'Positive ROI means your AI investment generates more value than it costs',
        'Payback period under 3 months is considered excellent for SaaS tools',
        'Per-person savings shows the individual productivity impact',
        '5-year value helps build a long-term investment case for leadership',
      ],
    },
    {
      id: 'exporting',
      heading: 'Exporting ROI Reports',
      body:
        'From the calculator, click "Export Report" to generate a PDF or XLSX ' +
        'report formatted for executive or board presentations. ' +
        'Reports include all inputs, calculation methodology, and benchmark sources.',
    },
  ],

  prev: { label: 'Budget Alerts',   path: '/docs/budget-alerts' },
  next: { label: 'Team Management', path: '/docs/teams'          },
}