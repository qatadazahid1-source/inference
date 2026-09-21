import type { ReactNode, TableHTMLAttributes } from 'react';
import styles from './Table.module.css';

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className, ...rest }: TableProps) {
  return (
    <div className={styles.tableWrapper} tabIndex={0} role="region" aria-label="Data table scroll container">
      <table className={`${styles.table} ${className ?? ''}`} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>;
}

interface TableCellProps {
  children: ReactNode;
  numeric?: boolean;
  muted?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export function TableCell({
  children,
  numeric = false,
  muted = false,
  align = 'left',
  className = '',
  style,
}: TableCellProps) {
  const cellClasses = [
    numeric ? styles.numeric : '',
    muted ? styles.textMuted : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <td className={cellClasses} style={{ textAlign: align, ...style }}>
      {children}
    </td>
  );
}

export function TableHeaderCell({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
}) {
  return <th scope="col" style={{ textAlign: align }}>{children}</th>;
}
