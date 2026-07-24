import AnimatedNumber from './AnimatedNumber'
import { USE_CASES } from './roi.utils'
import type { ROIResults, ROIInputs } from './roi.utils'
import styles from './ResultsPanel.module.css'

// Consistent line icons — matches the icon language used elsewhere on the
// page (see FeaturesSection), instead of mismatched emoji.
const MetricIcon = {
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trend: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 15l5-5 4 4 7-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bolt: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  ),
};

interface Props {
  results: ROIResults
  inputs: ROIInputs
}

export default function ResultsPanel({ results, inputs }: Props) {
  const useCase = USE_CASES.find(u => u.id === inputs.useCaseId)!
  const isPositive = results.netAnnualSavings >= 0

  return (
    <div className={styles.panel}>

      {/* PRIMARY METRIC */}
      <div className={styles.primaryCard}>
        <p className={styles.primaryLabel}>NET ANNUAL SAVINGS</p>
        <p className={`${styles.primaryValue} ${isPositive ? styles.positive : styles.negative}`}>
          <AnimatedNumber
            value={results.netAnnualSavings}
            prefix={results.netAnnualSavings >= 0 ? '$' : '-$'}
            format={n => Math.abs(n).toLocaleString()}
          />
        </p>
        <p className={styles.primarySub}>
          {results.roiPercent}% ROI · Payback in {results.paybackMonths} months
        </p>
      </div>

      {/* 4-METRIC GRID */}
      <div className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>{MetricIcon.clock}</span>
          <p className={styles.metricValue}>
            <AnimatedNumber value={results.hoursSavedPerYear} />
          </p>
          <p className={styles.metricLabel}>Hours Saved / Year</p>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>{MetricIcon.trend}</span>
          <p className={`${styles.metricValue} ${styles.green}`}>
            <AnimatedNumber value={results.roiPercent} suffix="%" />
          </p>
          <p className={styles.metricLabel}>Return on Investment</p>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>{MetricIcon.bolt}</span>
          <p className={styles.metricValue}>
            <AnimatedNumber value={results.efficiencyGain} suffix="%" />
          </p>
          <p className={styles.metricLabel}>Efficiency Gain</p>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricIcon}>{MetricIcon.calendar}</span>
          <p className={styles.metricValue}>
            {results.paybackMonths}
          </p>
          <p className={styles.metricLabel}>Months to Break Even</p>
        </div>
      </div>

      {/* BENEFIT BREAKDOWN */}
      <div className={styles.breakdown}>
        <p className={styles.breakdownTitle}>Where the Value Comes From</p>

        {[
          { label: 'Core productivity gain', val: results.valueSavedPerYear, plus: true },
          { label: 'Manual task automation', val: Math.round(results.valueSavedPerYear * 0.15), plus: true },
          { label: 'Tool consolidation savings', val: results.toolConsolidationSavings, plus: true },
          { label: 'Onboarding time saved', val: results.onboardingSavings, plus: true },
          { label: 'Rework / quality improvement', val: results.reworkSavings, plus: true },
          { label: 'Compliance hours saved', val: results.complianceSavings, plus: true },
          { label: 'Revenue lift (productivity)', val: results.revenueImpact, plus: true },
          { label: 'Annual AI tool cost', val: results.annualAICost, plus: false },
        ].map((row, i) => (
          <div key={i} className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>{row.label}</span>
            <span className={`${styles.breakdownVal} ${row.plus ? styles.plus : styles.minus}`}>
              {row.plus ? '+' : '−'}
              <AnimatedNumber value={row.val} prefix="$" format={n => n.toLocaleString()} />
            </span>
          </div>
        ))}

        <div className={styles.breakdownDivider} />
        <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
          <span>Total Annual Benefit</span>
          <span className={isPositive ? styles.plus : styles.minus}>
            <AnimatedNumber
              value={results.totalBenefit}
              prefix="$"
              format={n => n.toLocaleString()}
            />
          </span>
        </div>
      </div>

      {/* ADDITIONAL METRICS */}
      <div className={styles.extraGrid}>
        <div className={styles.extraCard}>
          <p className={styles.extraLabel}>Per Person / Year</p>
          <p className={styles.extraValue}>
            <AnimatedNumber value={results.perPersonSavings} prefix="$" format={n => n.toLocaleString()} />
          </p>
        </div>
        <div className={styles.extraCard}>
          <p className={styles.extraLabel}>Per Department / Year</p>
          <p className={styles.extraValue}>
            <AnimatedNumber value={results.perDepartmentSavings} prefix="$" format={n => n.toLocaleString()} />
          </p>
        </div>
        <div className={styles.extraCard}>
          <p className={styles.extraLabel}>5-Year Value</p>
          <p className={`${styles.extraValue} ${styles.green}`}>
            <AnimatedNumber value={results.fiveYearValue} prefix="$" format={n => n.toLocaleString()} />
          </p>
        </div>
        <div className={styles.extraCard}>
          <p className={styles.extraLabel}>Hrs Saved / Month</p>
          <p className={styles.extraValue}>
            <AnimatedNumber value={results.hoursSavedPerMonth} suffix=" hrs" />
          </p>
        </div>
      </div>

      {/* USE CASE INSIGHT */}
      <div className={styles.insightCard}>
        <span className={styles.insightIcon}>{useCase.icon}</span>
        <div>
          <p className={styles.insightTitle}>{useCase.label} Benchmark</p>
          <p className={styles.insightText}>{useCase.benchmark}</p>
          <p className={styles.insightBadge}>{useCase.savingsLabel}</p>
        </div>
      </div>

      {/* CTA */}
      <a href="/signup" className={styles.cta}>
        Get Your Full Analysis →
      </a>
      <p className={styles.ctaNote}>
        No credit card required · 14-day free trial
      </p>
    </div>
  )
}