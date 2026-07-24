import { useEffect, useRef } from 'react'

export function useScrollAnimation(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            entry.target
              .querySelectorAll('[data-animate]')
              .forEach((child, i) => {
                ;(child as HTMLElement).style.transitionDelay = `${i * 90}ms`
                child.classList.add('visible')
              })
          }
        })
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return ref
}