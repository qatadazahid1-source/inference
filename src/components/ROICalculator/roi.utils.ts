// ─── USE CASES ───────────────────────────────────────────────────

export interface UseCase {
  id: string
  label: string
  description: string
  efficiencyRate: number
  savingsLabel: string
  benchmark: string
  icon: string
}

export const USE_CASES: UseCase[] = [
  {
    id: 'code_generation',
    label: 'Code Generation',
    description: 'Writing, reviewing & debugging code',
    efficiencyRate: 0.42,
    savingsLabel: '42% faster development cycles',
    benchmark: 'Developers save avg 3.2 hrs/day',
    icon: '💻',
  },
  {
    id: 'data_analysis',
    label: 'Data Analysis',
    description: 'Analyzing datasets & generating reports',
    efficiencyRate: 0.38,
    savingsLabel: '38% faster insights',
    benchmark: 'Analysts save avg 2.8 hrs/day',
    icon: '📊',
  },
  {
    id: 'customer_support',
    label: 'Customer Support',
    description: 'Handling tickets, emails & live chat',
    efficiencyRate: 0.52,
    savingsLabel: '52% faster resolution',
    benchmark: 'Support teams save avg 4.1 hrs/day',
    icon: '🎧',
  },
  {
    id: 'content_creation',
    label: 'Content Creation',
    description: 'Writing blogs, copy, emails & docs',
    efficiencyRate: 0.45,
    savingsLabel: '45% faster content output',
    benchmark: 'Writers save avg 3.5 hrs/day',
    icon: '✍️',
  },
  {
    id: 'sales_automation',
    label: 'Sales & Lead Generation',
    description: 'Outreach, follow-ups & CRM updates',
    efficiencyRate: 0.35,
    savingsLabel: '35% more pipeline handled',
    benchmark: 'Sales teams save avg 2.5 hrs/day',
    icon: '📈',
  },
  {
    id: 'legal_compliance',
    label: 'Legal & Compliance',
    description: 'Contract review, policy docs & audits',
    efficiencyRate: 0.40,
    savingsLabel: '40% faster document review',
    benchmark: 'Legal teams save avg 3.1 hrs/day',
    icon: '⚖️',
  },
  {
    id: 'hr_recruitment',
    label: 'HR & Recruitment',
    description: 'Resume screening, job posts & onboarding',
    efficiencyRate: 0.44,
    savingsLabel: '44% faster hiring process',
    benchmark: 'HR teams save avg 3.4 hrs/day',
    icon: '👥',
  },
  {
    id: 'marketing_automation',
    label: 'Marketing Automation',
    description: 'Campaigns, social media & analytics',
    efficiencyRate: 0.41,
    savingsLabel: '41% more campaigns managed',
    benchmark: 'Marketing teams save avg 3.2 hrs/day',
    icon: '📣',
  },
  {
    id: 'financial_analysis',
    label: 'Financial Analysis',
    description: 'Forecasting, reporting & modeling',
    efficiencyRate: 0.36,
    savingsLabel: '36% faster financial reports',
    benchmark: 'Finance teams save avg 2.7 hrs/day',
    icon: '💰',
  },
  {
    id: 'research_development',
    label: 'Research & Development',
    description: 'Literature review, experiments & docs',
    efficiencyRate: 0.33,
    savingsLabel: '33% faster research cycles',
    benchmark: 'R&D teams save avg 2.5 hrs/day',
    icon: '🔬',
  },
  {
    id: 'product_management',
    label: 'Product Management',
    description: 'PRDs, user stories & roadmaps',
    efficiencyRate: 0.38,
    savingsLabel: '38% faster product cycles',
    benchmark: 'PMs save avg 2.9 hrs/day',
    icon: '🗂️',
  },
  {
    id: 'it_operations',
    label: 'IT Operations & DevOps',
    description: 'Monitoring, incidents & automation',
    efficiencyRate: 0.46,
    savingsLabel: '46% faster incident resolution',
    benchmark: 'IT teams save avg 3.6 hrs/day',
    icon: '🖥️',
  },
  {
    id: 'education_training',
    label: 'Education & Training',
    description: 'Course creation, tutoring & assessments',
    efficiencyRate: 0.48,
    savingsLabel: '48% faster content development',
    benchmark: 'Educators save avg 3.7 hrs/day',
    icon: '🎓',
  },
  {
    id: 'healthcare',
    label: 'Healthcare & Medical',
    description: 'Documentation, diagnosis assist & reports',
    efficiencyRate: 0.35,
    savingsLabel: '35% less documentation time',
    benchmark: 'Healthcare teams save avg 2.6 hrs/day',
    icon: '🏥',
  },
  {
    id: 'supply_chain',
    label: 'Supply Chain & Logistics',
    description: 'Inventory, forecasting & optimization',
    efficiencyRate: 0.39,
    savingsLabel: '39% better forecasting speed',
    benchmark: 'Ops teams save avg 3.0 hrs/day',
    icon: '📦',
  },
]

// ─── INPUT TYPES ─────────────────────────────────────────────────

export interface ROIInputs {
  monthlyAISpend: number
  teamSize: number
  hourlyRate: number
  useCaseId: string
  weeklyManualHours: number
  numberOfDepartments: number
  workflowCount: number
  monthlyRevenue: number
  newHiresPerYear: number
  onboardingHours: number
  reworkRatePercent: number
  complianceHoursPerMonth: number
  currentToolsCount: number
  adoptionMaturity: 'none' | 'beginner' | 'intermediate' | 'advanced'
  aiReadinessScore: number
}

// ─── RESULT TYPES ────────────────────────────────────────────────

export interface ROIResults {
  netAnnualSavings: number
  roiPercent: number
  hoursSavedPerMonth: number
  hoursSavedPerYear: number
  valueSavedPerYear: number
  annualAICost: number
  toolConsolidationSavings: number
  onboardingSavings: number
  reworkSavings: number
  complianceSavings: number
  revenueImpact: number
  totalBenefit: number
  efficiencyGain: number
  paybackMonths: number
  breakEvenMonth: number
  fiveYearValue: number
  perPersonSavings: number
  perDepartmentSavings: number
}

// ─── MATURITY MULTIPLIERS ─────────────────────────────────────────

const MATURITY_MULTIPLIER: Record<ROIInputs['adoptionMaturity'], number> = {
  none: 0.60,
  beginner: 0.72,
  intermediate: 0.88,
  advanced: 1.00,
}

// ─── CALCULATION ENGINE ───────────────────────────────────────────

export function calculateROI(inputs: ROIInputs): ROIResults {
  const useCase = USE_CASES.find(u => u.id === inputs.useCaseId)!
  const baseEfficiency = useCase.efficiencyRate

  const maturityMult = MATURITY_MULTIPLIER[inputs.adoptionMaturity]
  const readinessMult = 0.70 + (inputs.aiReadinessScore / 10) * 0.30
  const effectiveEfficiency = baseEfficiency * maturityMult * readinessMult

  const totalMonthlyHours = inputs.teamSize * 160
  const hoursSavedPerMonth = Math.round(totalMonthlyHours * effectiveEfficiency)
  const hoursSavedPerYear = hoursSavedPerMonth * 12
  const valueSavedPerYear = Math.round(hoursSavedPerYear * inputs.hourlyRate)

  const manualTaskSavingsPerYear = Math.round(
    inputs.teamSize *
    inputs.weeklyManualHours * 52 *
    effectiveEfficiency *
    inputs.hourlyRate * 0.30
  )

  const toolConsolidationSavings = Math.round(
    inputs.currentToolsCount * 150 * 12
  )

  const onboardingSavings = Math.round(
    inputs.newHiresPerYear *
    inputs.onboardingHours * 0.35 *
    inputs.hourlyRate
  )

  const reworkSavings = Math.round(
    inputs.teamSize * 160 * 12 *
    (inputs.reworkRatePercent / 100) *
    0.40 *
    inputs.hourlyRate
  )

  const complianceSavings = Math.round(
    inputs.complianceHoursPerMonth * 12 *
    0.30 *
    inputs.hourlyRate
  )

  const revenueImpact = Math.round(
    inputs.monthlyRevenue * 12 *
    effectiveEfficiency * 0.025 *
    (inputs.workflowCount / 10)
  )

  const deptMultiplier = 1 + (inputs.numberOfDepartments - 1) * 0.08

  const totalBenefit = Math.round(
    (valueSavedPerYear + manualTaskSavingsPerYear + toolConsolidationSavings +
     onboardingSavings + reworkSavings + complianceSavings + revenueImpact)
    * deptMultiplier
  )

  const annualAICost = inputs.monthlyAISpend * 12
  const netAnnualSavings = totalBenefit - annualAICost

  const roiPercent = annualAICost > 0
    ? Math.round((netAnnualSavings / annualAICost) * 100)
    : 0

  const paybackMonths = totalBenefit > 0
    ? parseFloat(((annualAICost / (totalBenefit / 12))).toFixed(1))
    : 0

  const fiveYearValue = netAnnualSavings * 5
  const efficiencyGain = Math.round(effectiveEfficiency * 100)
  const perPersonSavings = inputs.teamSize > 0
    ? Math.round(netAnnualSavings / inputs.teamSize) : 0
  const perDepartmentSavings = inputs.numberOfDepartments > 0
    ? Math.round(netAnnualSavings / inputs.numberOfDepartments) : 0

  return {
    netAnnualSavings,
    roiPercent,
    hoursSavedPerMonth,
    hoursSavedPerYear,
    valueSavedPerYear,
    annualAICost,
    toolConsolidationSavings,
    onboardingSavings,
    reworkSavings,
    complianceSavings,
    revenueImpact,
    totalBenefit,
    efficiencyGain,
    paybackMonths,
    breakEvenMonth: Math.ceil(paybackMonths),
    fiveYearValue,
    perPersonSavings,
    perDepartmentSavings,
  }
}

// ─── FORMATTERS ─────────────────────────────────────────────────

export const fmt = {
  currency: (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n),

  number: (n: number) =>
    new Intl.NumberFormat('en-US').format(n),

  percent: (n: number) => `${n}%`,
}