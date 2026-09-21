import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...rest }: InputProps) {
  const generatedId = label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined;
  const inputId = id ?? generatedId;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const existingDescribedBy = rest['aria-describedby'];
  const ariaDescribedBy = [existingDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input
        id={inputId}
        className={`${styles.input} ${error ? styles.inputError : ''} ${className ?? ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={ariaDescribedBy}
        {...rest}
      />
      {error && <span id={errorId} className={styles.errorText} role="alert">{error}</span>}
    </div>
  );
}

