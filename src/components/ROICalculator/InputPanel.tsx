import type { ROIInputs } from './roi.utils'
import UseCaseDropdown from './UseCaseDropdown'
import styles from './InputPanel.module.css'

interface Props {
  inputs: ROIInputs
  onChange: <K extends keyof ROIInputs>(key: K, val: ROIInputs[K]) => void
}

const maturityOptions: Array<{
  value: ROIInputs['adoptionMaturity']
  label: string
  desc: string
}> = [
  { value: 'none', label: 'No AI yet', desc: 'Starting from scratch' },
  { value: 'beginner', label: 'Beginner', desc: '1–2 tools, inconsistent use' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Multiple tools, regular use' },
  { value: 'advanced', label: 'Advanced', desc: 'AI-first workflows company-wide' },
]

export default function InputPanel({ inputs, onChange }: Props) {
  const spendPct = `${((inputs.monthlyAISpend - 500) / (50000 - 500)) * 100}%`
  const revenuePct = `${((inputs.monthlyRevenue - 10000) / (50000000 - 10000)) * 100}%`

  return (
    <div className={styles.panel}>

      {/* SECTION A: Team & Organization */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>A</span>
          <div>
            <p className={styles.sectionTitle}>Team & Organization</p>
            <p className={styles.sectionDesc}>Core team details that drive base calculations</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Monthly AI Spend</label>
          <p className={styles.sliderBig}>${inputs.monthlyAISpend.toLocaleString()}</p>
          <input
            type="range"
            min={500}
            max={50000}
            step={500}
            value={inputs.monthlyAISpend}
            className={styles.slider}
            style={{ '--fill': spendPct } as React.CSSProperties}
            onChange={e => onChange('monthlyAISpend', +e.target.value)}
          />
          <div className={styles.sliderLabels}>
            <span>$500</span><span>$50,000</span>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Team Size</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min={1}
                max={10000}
                value={inputs.teamSize}
                className={styles.input}
                onChange={e => onChange('teamSize', +e.target.value)}
              />
              <span className={styles.suffix}>people</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Avg Hourly Rate</label>
            <div className={styles.inputWrap}>
              <span className={styles.prefix}>$</span>
              <input
                type="number"
                min={10}
                max={500}
                value={inputs.hourlyRate}
                className={`${styles.input} ${styles.inputPrefixed}`}
                onChange={e => onChange('hourlyRate', +e.target.value)}
              />
              <span className={styles.suffix}>/hr</span>
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Primary AI Use Case</label>
          <UseCaseDropdown
            selected={inputs.useCaseId}
            onSelect={id => onChange('useCaseId', id)}
          />
        </div>
      </div>

      {/* SECTION B: Time & Workflow */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>B</span>
          <div>
            <p className={styles.sectionTitle}>Time & Workflow</p>
            <p className={styles.sectionDesc}>Current manual work patterns</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Weekly Hours on Repetitive Tasks
            <span className={styles.labelHint}> — per person</span>
          </label>
          <p className={styles.sliderBig}>{inputs.weeklyManualHours} hrs/week</p>
          <input
            type="range"
            min={2}
            max={40}
            step={1}
            value={inputs.weeklyManualHours}
            className={styles.slider}
            style={{ '--fill': `${((inputs.weeklyManualHours - 2) / 38) * 100}%` } as React.CSSProperties}
            onChange={e => onChange('weeklyManualHours', +e.target.value)}
          />
          <div className={styles.sliderLabels}>
            <span>2 hrs</span><span>40 hrs</span>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Departments Using AI</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min={1}
                max={20}
                value={inputs.numberOfDepartments}
                className={styles.input}
                onChange={e => onChange('numberOfDepartments', +e.target.value)}
              />
              <span className={styles.suffix}>depts</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>AI-Powered Workflows</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min={1}
                max={50}
                value={inputs.workflowCount}
                className={styles.input}
                onChange={e => onChange('workflowCount', +e.target.value)}
              />
              <span className={styles.suffix}>flows</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: Business Scale */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>C</span>
          <div>
            <p className={styles.sectionTitle}>Business Scale</p>
            <p className={styles.sectionDesc}>Revenue & growth context for full impact</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Monthly Revenue</label>
          <p className={styles.sliderBig}>${(inputs.monthlyRevenue / 1000).toFixed(0)}K</p>
          <input
            type="range"
            min={10000}
            max={50000000}
            step={10000}
            value={inputs.monthlyRevenue}
            className={styles.slider}
            style={{ '--fill': revenuePct } as React.CSSProperties}
            onChange={e => onChange('monthlyRevenue', +e.target.value)}
          />
          <div className={styles.sliderLabels}>
            <span>$10K</span><span>$50M</span>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>New Hires / Year</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min={0}
                max={500}
                value={inputs.newHiresPerYear}
                className={styles.input}
                onChange={e => onChange('newHiresPerYear', +e.target.value)}
              />
              <span className={styles.suffix}>people</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Onboarding Hours</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min={10}
                max={200}
                value={inputs.onboardingHours}
                className={styles.input}
                onChange={e => onChange('onboardingHours', +e.target.value)}
              />
              <span className={styles.suffix}>hrs/hire</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION D: Quality & Risk */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>D</span>
          <div>
            <p className={styles.sectionTitle}>Quality & Risk</p>
            <p className={styles.sectionDesc}>Rework, compliance & tool overhead</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Work Needing Revision / Rework
            <span className={styles.labelHint}> — % of total output</span>
          </label>
          <p className={styles.sliderBig}>{inputs.reworkRatePercent}%</p>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={inputs.reworkRatePercent}
            className={styles.slider}
            style={{ '--fill': `${((inputs.reworkRatePercent - 5) / 45) * 100}%` } as React.CSSProperties}
            onChange={e => onChange('reworkRatePercent', +e.target.value)}
          />
          <div className={styles.sliderLabels}>
            <span>5%</span><span>50%</span>
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Compliance Hrs/Month</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min={0}
                max={500}
                value={inputs.complianceHoursPerMonth}
                className={styles.input}
                onChange={e => onChange('complianceHoursPerMonth', +e.target.value)}
              />
              <span className={styles.suffix}>hrs</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Tools Being Replaced</label>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min={0}
                max={30}
                value={inputs.currentToolsCount}
                className={styles.input}
                onChange={e => onChange('currentToolsCount', +e.target.value)}
              />
              <span className={styles.suffix}>tools</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION E: AI Adoption Maturity */}
      <div className={styles.sectionBlock}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNum}>E</span>
          <div>
            <p className={styles.sectionTitle}>AI Adoption Maturity</p>
            <p className={styles.sectionDesc}>Adjusts realism of your savings estimate</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Current AI Maturity Level</label>
          <div className={styles.maturityGrid}>
            {maturityOptions.map(opt => (
              <button
                key={opt.value}
                className={`${styles.maturityBtn} ${
                  inputs.adoptionMaturity === opt.value ? styles.maturityActive : ''
                }`}
                onClick={() => onChange('adoptionMaturity', opt.value)}
              >
                <span className={styles.maturityLabel}>{opt.label}</span>
                <span className={styles.maturityDesc}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Team AI Readiness Score
            <span className={styles.labelHint}> — {inputs.aiReadinessScore}/10</span>
          </label>
          <p className={styles.sliderBig}>{inputs.aiReadinessScore} / 10</p>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={inputs.aiReadinessScore}
            className={styles.slider}
            style={{ '--fill': `${((inputs.aiReadinessScore - 1) / 9) * 100}%` } as React.CSSProperties}
            onChange={e => onChange('aiReadinessScore', +e.target.value)}
          />
          <div className={styles.sliderLabels}>
            <span>1 — Not ready</span><span>10 — Fully ready</span>
          </div>
        </div>
      </div>

    </div>
  )
}