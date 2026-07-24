import { useEffect, useRef } from 'react';

const useScrollReveal = (threshold = 0.12) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          const children = entry.target.querySelectorAll('[data-delay]');
          children.forEach((child) => {
            const delay = (child as HTMLElement).dataset.delay || '0';
            (child as HTMLElement).style.transitionDelay = delay + 'ms';
            child.classList.add('visible');
          });
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
};

export default useScrollReveal;