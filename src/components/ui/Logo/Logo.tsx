import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
  variant?: 'full' | 'mark' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  showTagline = false,
  className = '',
  onClick,
}) => {
  const containerClasses = [
    styles.container,
    styles[size],
    styles[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} onClick={onClick}>
      <img
        src="/ordisum-logo.png"
        alt="ORDISUM — Intelligence in Order"
        className={styles.logoImg}
      />
    </div>
  );
};
