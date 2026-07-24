import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  slidePanel?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'medium', slidePanel = false }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  if (slidePanel) {
    return (
      <>
        <div className={styles.slideBackdrop} onClick={onClose} aria-hidden="true" />
        <div className={styles.slidePanel} role="dialog" aria-modal="true">
          <div className={styles.slideHeader}>
            {title && <h2 className={styles.title}>{title}</h2>}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className={styles.slideBody}>{children}</div>
        </div>
      </>
    );
  }

  return (
    <div className={styles.backdrop} onClick={onClose} aria-hidden="true">
      <div
        className={`${styles.modal} ${styles[size]}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
