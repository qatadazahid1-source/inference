import type { ReactNode, HTMLAttributes } from 'react';
import styles from './Grid.module.css';

interface GridContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function GridContainer({ children, className, ...rest }: GridContainerProps) {
  return (
    <div className={`${styles.gridContainer} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}
