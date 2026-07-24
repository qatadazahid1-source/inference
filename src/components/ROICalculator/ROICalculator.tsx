import { useState, useEffect } from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import InputPanel from './InputPanel'
import ResultsPanel from './ResultsPanel'
import { calculateROI } from './roi.utils'
import type { ROIInputs, ROIResults } from './roi.utils'
import styles from './ROICalculator.module.css'

const DEFAULT_INPUTS: ROIInputs = {
  monthlyAISpend: 8500,
  teamSize: 25,
  hourlyRate: 85,
  useCaseId: 'code_generation',
  weeklyManualHours: 15,
  numberOfDepartments: 3,
  workflowCount: 8,
  monthlyRevenue: 500000,
  newHiresPerYear: 10,
  onboardingHours: 40,
  reworkRatePercent: 15,
  complianceHoursPerMonth: 20,
  currentToolsCount: 5,
  adoptionMaturity: 'beginner',
  aiReadinessScore: 6,
}

export default function ROICalculator() {
  const ref = useScrollAnimation()
  const [inputs, setInputs] = useState<ROIInputs>(DEFAULT_INPUTS)
  const [results, setResults] = useState<ROIResults>(
    calculateROI(DEFAULT_INPUTS)
  )

  useEffect(() => {
    setResults(calculateROI(inputs))
  }, [inputs])

  const update = <K extends keyof ROIInputs>(key: K, val: ROIInputs[K]) =>
    setInputs(prev => ({ ...prev, [key]: val }))

  return (
    <section
      id="roi-calculator"
      ref={ref as React.RefObject<HTMLElement>}
      className={`${styles.section} fade-in-up`}
    >
      <div className={styles.inner}>

        <p className={styles.eyebrow}>ROI Calculator</p>
        <h2 className={styles.heading}>
          See your potential savings <span className={styles.accent}>in real dollars</span>
        </h2>
        <p className={styles.sub}>
          Adjust the numbers below — every result updates live, calculated entirely in your browser.
        </p>

        <div className={styles.grid}>
          <InputPanel inputs={inputs} onChange={update} />
          <ResultsPanel results={results} inputs={inputs} />
        </div>

        <p className={styles.trustNote}>
          Estimates only, based on the inputs you provide. Actual results vary by team and use case.
        </p>
      </div>
    </section>
  )
}