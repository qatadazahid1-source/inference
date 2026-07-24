import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={styles.field}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input
        id={inputId}
        className={`${styles.input} ${error ? styles.inputError : ''} ${className ?? ''}`}
        {...rest}
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
