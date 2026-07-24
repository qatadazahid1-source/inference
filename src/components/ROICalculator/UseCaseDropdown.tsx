import { useState, useRef, useEffect } from 'react'
import { USE_CASES } from './roi.utils'
import styles from './UseCaseDropdown.module.css'

interface Props {
  selected: string
  onSelect: (id: string) => void
}

export default function UseCaseDropdown({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = USE_CASES.find(u => u.id === selected)!

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={styles.wrap}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className={styles.triggerIcon}>{current.icon}</span>
        <div className={styles.triggerText}>
          <span className={styles.triggerLabel}>{current.label}</span>
          <span className={styles.triggerDesc}>{current.description}</span>
        </div>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}>▾</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {USE_CASES.map(uc => (
            <div
              key={uc.id}
              className={`${styles.option} ${uc.id === selected ? styles.optionActive : ''}`}
              onClick={() => { onSelect(uc.id); setOpen(false) }}
            >
              <span className={styles.optionIcon}>{uc.icon}</span>
              <div className={styles.optionText}>
                <span className={styles.optionLabel}>{uc.label}</span>
                <span className={styles.optionDesc}>{uc.description}</span>
                <span className={styles.optionBench}>{uc.benchmark}</span>
              </div>
              <span className={styles.optionBadge}>
                {Math.round(uc.efficiencyRate * 100)}% saved
              </span>
              {uc.id === selected && <span className={styles.check}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}