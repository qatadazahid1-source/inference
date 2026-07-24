import type { ReactNode, HTMLAttributes, CSSProperties } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  children: ReactNode;
}

export function Card({ hoverable = false, children, className, ...rest }: CardProps) {
  const classNames = [styles.card, hoverable ? styles.hoverable : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  );
}

interface CardHeaderProps { children: ReactNode; className?: string; }
export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={[styles.cardHeader, className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

interface CardTitleProps { children: ReactNode; className?: string; }
export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h2 className={[styles.cardTitle, className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </h2>
  );
}

interface CardContentProps { children: ReactNode; className?: string; style?: CSSProperties; }
export function CardContent({ children, className, style }: CardContentProps) {
  return (
    <div className={[styles.cardContent, className ?? ''].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}
