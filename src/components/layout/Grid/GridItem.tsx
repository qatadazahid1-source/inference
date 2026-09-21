import type { ReactNode, HTMLAttributes } from 'react';
import styles from './Grid.module.css';

type SpanRange = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  span?: SpanRange;
  children: ReactNode;
  className?: string;
}

export function GridItem({ span = 12, children, className, ...rest }: GridItemProps) {
  const spanClass = styles[`span${span}`] ?? styles.span12;
  return (
    <div className={`${spanClass} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}
