import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

const useCountUp = ({
  target,
  duration = 1500,
  prefix = '',
  suffix = '',
}: UseCountUpOptions) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const start = performance.now();

          const update = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * ease));
            if (progress < 1) requestAnimationFrame(update);
          };
          requestAnimationFrame(update);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, display: `${prefix}${value.toLocaleString()}${suffix}` };
};

export default useCountUp;