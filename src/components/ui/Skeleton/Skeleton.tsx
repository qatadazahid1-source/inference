import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  variant?: 'text' | 'title' | 'circle' | 'rect';
}

export function Skeleton({ width, height, borderRadius, variant = 'text' }: SkeletonProps) {
  const classNames = [styles.skeleton, styles[variant] ?? ''].filter(Boolean).join(' ');
  return (
    <div
      className={classNames}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}
