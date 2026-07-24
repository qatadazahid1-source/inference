import { useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  format?: (n: number) => string
}

export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  duration = 700,
  format,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const end = value
    const startTime = performance.now()
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const current = Math.round(start + (end - start) * easeOut(t))
      if (ref.current) {
        ref.current.textContent = format
          ? `${prefix}${format(current)}${suffix}`
          : `${prefix}${current.toLocaleString()}${suffix}`
      }
      if (t < 1) requestAnimationFrame(tick)
      else prev.current = end
    }
    requestAnimationFrame(tick)
  }, [value, prefix, suffix, duration, format])

  return (
    <span ref={ref}>
      {prefix}{format ? format(value) : value.toLocaleString()}{suffix}
    </span>
  )
}